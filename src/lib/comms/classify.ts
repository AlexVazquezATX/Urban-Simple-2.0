// AI triage for inbound email (Comms Hub phase 3).
//
// Classifies an inbound reply into a small action vocabulary + one-line
// summary, and drafts responses on demand. Uses the same Gemini setup as
// outreach-composer. All functions fail soft — classification is enrichment,
// never a gate.

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
)

export const AI_CATEGORIES = ['interested', 'not_interested', 'question', 'ooo', 'unsubscribe', 'other'] as const
export type AiCategory = (typeof AI_CATEGORIES)[number]

export interface Classification {
  category: AiCategory
  summary: string
}

/** Classify an inbound email. Returns null on any failure (no key, API error). */
export async function classifyInbound(subject: string | null, body: string | null): Promise<Classification | null> {
  if (!process.env.GOOGLE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY && !process.env.NEXT_PUBLIC_GEMINI_API_KEY) return null
  const text = `${subject ?? ''}\n\n${body ?? ''}`.trim().slice(0, 6000)
  if (!text) return null
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const prompt = `You triage inbound email replies for a commercial cleaning company's CRM.
Classify this reply into EXACTLY one category:
- interested: wants to talk, asks for walkthrough/quote/meeting, positive engagement
- not_interested: polite or firm decline, "we're covered", "no thanks"
- question: asks something that needs an answer but intent unclear
- ooo: auto-reply / out of office / vacation responder
- unsubscribe: asks to stop emailing, remove from list, "stop contacting us"
- other: anything else (bounz notices, unrelated, unclear)

Reply with STRICT JSON only, no markdown: {"category":"...","summary":"one sentence, max 20 words, plain factual"}

EMAIL:
${text}`
    const result = await model.generateContent(prompt)
    const raw = result.response.text().trim().replace(/^```(?:json)?/m, '').replace(/```$/m, '').trim()
    const parsed = JSON.parse(raw) as { category?: string; summary?: string }
    const category = (AI_CATEGORIES as readonly string[]).includes(parsed.category ?? '')
      ? (parsed.category as AiCategory)
      : 'other'
    return { category, summary: (parsed.summary ?? '').slice(0, 300) }
  } catch (err) {
    console.error('[COMMS] classifyInbound failed:', err)
    return null
  }
}

export interface DraftReplyInput {
  inboundSubject: string | null
  inboundBody: string | null
  counterpartName?: string | null
  companyName?: string | null
  threadContext?: string | null // prior outbound message, if known
}

/** Draft a reply for human review. Returns null on failure. */
export async function draftReply(input: DraftReplyInput): Promise<string | null> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const prompt = `You draft email replies for Alex, owner of Urban Simple, a commercial cleaning company in Austin specializing in hospitality (restaurants, hotels, commercial kitchens).

HARD RULES:
- Never use em dashes anywhere.
- No bracketed placeholders like [Name] — if the recipient's name is unknown, open with "Hi" or "Hello there".
- Only verifiable facts; never invent case studies, clients, or social proof.
- Next steps are walkthroughs or email replies, never phone calls.
- Sign as "Alex". Keep it short (under 120 words), warm, direct, no fluff.

CONTEXT:
${input.companyName ? `Prospect company: ${input.companyName}` : ''}
${input.counterpartName ? `Recipient: ${input.counterpartName}` : ''}
${input.threadContext ? `Our previous message:\n${input.threadContext.slice(0, 1500)}` : ''}

THEIR REPLY (respond to this):
Subject: ${input.inboundSubject ?? '(none)'}
${(input.inboundBody ?? '').slice(0, 3000)}

Write ONLY the reply body text (no subject line, no quoted thread).`
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    return text || null
  } catch (err) {
    console.error('[COMMS] draftReply failed:', err)
    return null
  }
}
