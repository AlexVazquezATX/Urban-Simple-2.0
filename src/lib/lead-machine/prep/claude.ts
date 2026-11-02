// The two Claude calls in account prep: read the research material and pick
// out the decision maker and usable facts, then write the first email. Both
// return schema-checked JSON. A draft that breaks the house rules gets one
// rewrite with the problems listed, then is dropped rather than queued.

import Anthropic from '@anthropic-ai/sdk'
import { DRAFT_SYSTEM, RESEARCH_SYSTEM, validateDraft, type Draft } from './copy'

const MODEL = 'claude-opus-5-5'

export type ResearchNotes = {
  decisionMaker: { name: string; title: string | null; evidence: string } | null
  highlights: string[]
  segmentNote: string
  cautions: string[]
}

const RESEARCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['decisionMaker', 'highlights', 'segmentNote', 'cautions'],
  properties: {
    decisionMaker: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'title', 'evidence'],
          properties: {
            name: { type: 'string' },
            title: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            evidence: { type: 'string' },
          },
        },
      ],
    },
    highlights: { type: 'array', items: { type: 'string' } },
    segmentNote: { type: 'string' },
    cautions: { type: 'array', items: { type: 'string' } },
  },
} as const

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['subject', 'body', 'angle'],
  properties: {
    subject: { type: 'string' },
    body: { type: 'string' },
    angle: { type: 'string', description: 'One line: which observation and which pain the email leads with.' },
  },
} as const

export type Usage = { calls: number; inputTokens: number; outputTokens: number }

/** The night's time is up; the account is left for the next run. */
export class OutOfTime extends Error {}

export class ClaudeWriter {
  private client: Anthropic
  readonly usage: Usage = { calls: 0, inputTokens: 0, outputTokens: 0 }

  /** Wall-clock time (ms) by which every call must be done. */
  deadline = Infinity

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 })
  }

  private async json<T>(system: string, user: string, schema: Record<string, unknown>): Promise<T> {
    const left = this.deadline - Date.now() - 5_000
    if (left < 20_000) throw new OutOfTime('Out of time for this run')
    const res = await this.client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
      // A safety decline re-runs on Anthropic's recommended fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    }, { timeout: Math.min(60_000, left), maxRetries: left > 130_000 ? 1 : 0 })
    this.usage.calls++
    this.usage.inputTokens += res.usage.input_tokens
    this.usage.outputTokens += res.usage.output_tokens
    if (res.stop_reason === 'refusal') throw new Error('Claude declined this request')
    if (res.stop_reason === 'max_tokens') throw new Error('Claude ran out of room before finishing')
    const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
    return JSON.parse(text) as T
  }

  async research(material: string): Promise<ResearchNotes> {
    const notes = await this.json<ResearchNotes>(RESEARCH_SYSTEM, material, RESEARCH_SCHEMA)
    return {
      decisionMaker: notes.decisionMaker?.name?.trim() ? notes.decisionMaker : null,
      highlights: (notes.highlights ?? []).slice(0, 4),
      segmentNote: notes.segmentNote ?? '',
      cautions: notes.cautions ?? [],
    }
  }

  /** A rule-abiding draft, or the problems that remained after one rewrite. */
  async draft(brief: string, firstName: string | null, businessName: string): Promise<{ draft: Draft & { angle: string }; problems: string[] }> {
    let draft = await this.json<Draft & { angle: string }>(DRAFT_SYSTEM, brief, DRAFT_SCHEMA)
    let problems = validateDraft(draft, { firstName, businessName })
    if (problems.length) {
      const retry = `${brief}\n\nYour previous draft was rejected for these reasons:\n${problems.map((p) => `- ${p}`).join('\n')}\n\nPrevious draft:\nSubject: ${draft.subject}\n${draft.body}\n\nWrite it again, fixing every problem.`
      draft = await this.json<Draft & { angle: string }>(DRAFT_SYSTEM, retry, DRAFT_SCHEMA)
      problems = validateDraft(draft, { firstName, businessName })
    }
    return { draft, problems }
  }
}
