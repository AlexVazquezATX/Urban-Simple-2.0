import { NextRequest, NextResponse } from 'next/server'
import {
  sendChatMessage,
  sendChatWithTools,
  CASSIE_SYSTEM_PROMPT,
  GEMINI_MODEL_ID,
  GEMINI_API_KEY,
} from '@/features/ai/lib/gemini-client'
import {
  buildBusinessContext,
  formatContextForAI,
} from '@/features/ai/lib/context-builder'
import {
  classifyQuery,
  enhancePromptWithClassification,
} from '@/features/ai/lib/query-classifier'
import {
  detectLanguage,
  addLanguageInstruction,
  getLanguageSystemPrompt,
} from '@/features/ai/lib/language-detector'
import { getCurrentUser } from '@/lib/auth'
import {
  getOrCreateConversation,
  saveMessage,
  getConversationHistory,
} from '@/features/ai/lib/conversation-manager'
import { generateAttachments } from '@/features/ai/lib/attachment-generator'
import {
  actionToolsSystemPromptAddendum,
  isSearchToolName,
  parseToolCall,
} from '@/features/ai/lib/action-tools'
import {
  buildActionContext,
  formatActionContextForLLM,
} from '@/features/ai/lib/action-context'
import type { MessageAttachment } from '@/features/ai/types/ai-types'
import { prisma } from '@/lib/db'
import type { Content } from '@google/generative-ai'
import { generateOutreachMessage, type ProspectData } from '@/lib/ai/outreach-composer'
import type { ProposedActionSet, ActionField } from '@/features/ai/types/action-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ChatImageInput {
  /** MIME type, e.g. "image/png", "image/jpeg", "image/webp", "image/gif". */
  mimeType: string
  /** Pure base64 (no `data:image/...;base64,` prefix). */
  data: string
}

interface ChatRequest {
  message: string
  includeContext?: boolean
  conversationId?: string
  /**
   * Optional inline images for multi-modal turns. Each image rides along as a
   * Gemini inlineData part. Quick-path: not persisted to the conversation
   * record — they show in the current session bubble only.
   */
  images?: ChatImageInput[]
}

const MAX_IMAGES_PER_REQUEST = 5
const MAX_BYTES_PER_IMAGE = 5 * 1024 * 1024 // ~5 MB after base64-decode
const ALLOWED_IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
])

function sanitizeImages(raw: unknown): ChatImageInput[] {
  if (!Array.isArray(raw)) return []
  const out: ChatImageInput[] = []
  for (const item of raw.slice(0, MAX_IMAGES_PER_REQUEST)) {
    if (!item || typeof item !== 'object') continue
    const obj = item as Record<string, unknown>
    const mimeType = typeof obj.mimeType === 'string' ? obj.mimeType.toLowerCase() : ''
    const data = typeof obj.data === 'string' ? obj.data : ''
    if (!ALLOWED_IMAGE_MIME.has(mimeType)) continue
    if (!data) continue
    // base64 is ~4/3 the size of decoded bytes; cap on the encoded length so
    // a malformed/oversized payload doesn't blow up Gemini's request limit.
    if (data.length > Math.ceil(MAX_BYTES_PER_IMAGE * 1.4)) continue
    out.push({ mimeType, data })
  }
  return out
}

export async function POST(request: NextRequest) {
  try {
    console.log('[AI Chat] Received request')

    // IMPORTANT: Require authentication and SUPER_ADMIN role
    const user = await getCurrentUser()

    if (!user) {
      console.log('[AI Chat] Unauthorized - no user found')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (user.role !== 'SUPER_ADMIN') {
      console.log('[AI Chat] Forbidden - user role:', user.role)
      return NextResponse.json(
        {
          error: 'Forbidden: AI Assistant is currently only available to super administrators',
          userRole: user.role,
        },
        { status: 403 }
      )
    }

    console.log('[AI Chat] Authorized user:', user.email, '(SUPER_ADMIN)')
    console.log('[AI Chat] Gemini key resolved:', !!GEMINI_API_KEY, '(length:', GEMINI_API_KEY.length, ')')

    const body: ChatRequest = await request.json()
    const { message, includeContext = true, conversationId: providedConversationId } = body
    const images = sanitizeImages(body.images)

    console.log('[AI Chat] Message:', message, '| images:', images.length)

    // Either text or at least one image must be present.
    if ((!message || message.trim().length === 0) && images.length === 0) {
      return NextResponse.json(
        { error: 'Message or image is required' },
        { status: 400 }
      )
    }

    // Get or create conversation
    const conversationId = providedConversationId || await getOrCreateConversation(user.id)
    console.log('[AI Chat] Conversation ID:', conversationId)

    // Load conversation history for context
    console.log('[AI Chat] Loading conversation history...')
    const conversationHistory = await getConversationHistory(conversationId)
    console.log('[AI Chat] Loaded', conversationHistory.length, 'previous messages')

    // Detect language
    console.log('[AI Chat] Detecting language...')
    const detectedLanguage = detectLanguage(message)
    console.log('[AI Chat] Language detected:', detectedLanguage)

    // Classify the query to understand intent
    console.log('[AI Chat] Classifying query...')
    const classification = classifyQuery(message)
    console.log('[AI Chat] Query classified:', classification.intent, `(${(classification.confidence * 100).toFixed(0)}% confidence)`)

    // Only include business context for business-related queries
    const needsBusinessContext = classification.intent !== 'general'

    // Build business context if needed
    let contextString: string | undefined
    let businessContext: any = null
    if (includeContext && needsBusinessContext) {
      console.log('[AI Chat] Building business context...')
      businessContext = await buildBusinessContext()
      contextString = formatContextForAI(businessContext)
      console.log('[AI Chat] Context built successfully')
    } else if (!needsBusinessContext) {
      console.log('[AI Chat] Skipping context - general conversation query')
    }

    // Build conversation history context (last 10 messages for context)
    const recentHistory = conversationHistory.slice(-10)
    let historyContext = ''
    if (recentHistory.length > 0) {
      historyContext = '\n\nRecent Conversation History:\n' +
        recentHistory.map(msg => `${msg.role === 'user' ? 'Alex' : 'You'}: ${msg.content}`).join('\n')
    }

    // Enhance the prompt with classification insights
    let enhancedMessage = contextString
      ? enhancePromptWithClassification(message, classification, contextString)
      : message

    // Add conversation history
    if (historyContext) {
      enhancedMessage = historyContext + '\n\n' + enhancedMessage
    }

    // Add language instruction if Spanish
    enhancedMessage = addLanguageInstruction(enhancedMessage, detectedLanguage)

    // Build action context (compact lists with ids the LLM uses to resolve
    // names → records when proposing changes). Skipped for casual chat.
    let actionContextString: string | undefined
    if (needsBusinessContext) {
      console.log('[AI Chat] Building action context...')
      const actionContext = await buildActionContext({
        companyId: user.companyId,
        branchId: user.branchId,
      })
      actionContextString = formatActionContextForLLM(actionContext)
    }

    // Path decision: business-y turns go through the tools-enabled call (the
    // model can either answer in text OR propose an action chain / ask for a
    // clarification). Casual turns stay on the simple chat call for speed.
    // Images force the tools path because sendChatMessage is text-only — the
    // tools path builds Content[] which supports inlineData parts.
    const useTools = needsBusinessContext || images.length > 0
    let response: string
    let attachments: MessageAttachment[] = []

    console.log(
      '[AI Chat] Calling Gemini API with',
      recentHistory.length,
      'messages of history...',
      useTools ? '(tools enabled)' : '(text only)'
    )
    const startTime = Date.now()

    if (useTools) {
      const fullPrompt = [
        CASSIE_SYSTEM_PROMPT,
        actionToolsSystemPromptAddendum(),
        actionContextString,
        contextString ? `BUSINESS CONTEXT:\n${contextString}` : '',
        historyContext,
        `User: ${message}`,
        `=== FINAL REMINDERS BEFORE YOU ANSWER ===

Respond with EITHER a tool call (propose_action_chain, ask_clarification, or one of the search_* tools) OR plain text. Use a tool only when the user wants to make a change, you genuinely need to clarify, or you need to look up a record not in ACTION CONTEXT. For questions or casual chat, respond with text.

OUTREACH DRAFTS — read carefully. If the user is asking you to "draft an email", "write an email", "compose outreach", "draft a follow-up", "put it in drafts", or "drop it into outreach":
  - You MUST call propose_action_chain with entity="outreach_draft". DO NOT type out a "Subject:" + body block in your text reply. The composer runs server-side after the user clicks Apply — typing it yourself creates a fake preview.
  - Even if the user says "looks good, drop it in" referring to a draft you typed inline, you STILL need to call propose_action_chain — your inline text never created anything. The first real action is your tool call.
  - DO NOT say "I have dropped/saved/sent/queued/drafted that for you" without calling the tool. Any such phrase without a tool call is a lie that will be flagged.

Generally: if you find yourself about to claim you did something (added, created, saved, sent, dropped, scheduled, drafted, etc.), STOP and call the appropriate tool instead. The preview card IS the confirmation; you do not narrate it.`,
      ]
        .filter(Boolean)
        .join('\n\n')

      // Multi-turn loop. Search calls feed function_response back into the
      // model so it can continue toward a terminal answer (propose / clarify /
      // text). Capped at a generous number — 8 turns lets her do up to ~7
      // sequential searches plus one terminal call. The search tools also
      // accept a `queries` array now, so a 5-prospect batch only burns one
      // turn if she uses it correctly.
      const MAX_TURNS = 8
      // Build the user turn's parts: images first (Gemini convention places
      // visual context before the text instruction), then the prompt text.
      const initialUserParts: any[] = images.map((img) => ({
        inlineData: { mimeType: img.mimeType, data: img.data },
      }))
      initialUserParts.push({ text: fullPrompt })
      const contents: Content[] = [
        { role: 'user', parts: initialUserParts },
      ]
      // Only WRITE tools (propose_action_chain / ask_clarification) count for
      // the hallucination bypass. Search tools are read-only — if Cassie
      // searches and then narrates a fake confirmation in text, the detector
      // must still run.
      let writeToolWasCalled = false
      let terminalResult: Awaited<ReturnType<typeof sendChatWithTools>> | null = null
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const turnResult = await sendChatWithTools(contents)
        if (turnResult.kind === 'tool_call' && isSearchToolName(turnResult.name)) {
          const searchResult = await executeSearchTool(turnResult.name, turnResult.args, {
            companyId: user.companyId,
            branchId: user.branchId,
          })
          // Echo the model's content verbatim so any SDK-unknown fields (esp.
          // `thoughtSignature`, required by Gemini 3.x for multi-turn function
          // calling) round-trip back to the API. Reconstructing the part by
          // hand drops the signature and triggers a 400.
          contents.push(turnResult.modelContent)
          contents.push({
            role: 'function',
            parts: [
              {
                functionResponse: {
                  name: turnResult.name,
                  response: searchResult as any,
                },
              },
            ],
          })
          continue
        }
        terminalResult = turnResult
        break
      }
      if (!terminalResult) {
        console.warn('[AI Chat] Multi-turn loop hit MAX_TURNS without a terminal result')
        response = "I got stuck looking that up — could you rephrase or paste the id you mean?"
      } else if (terminalResult.kind === 'tool_call') {
        writeToolWasCalled = true
        try {
          const parsed = parseToolCall({
            name: terminalResult.name,
            args: terminalResult.args,
          })
          if (parsed.kind === 'actions') {
            // Pre-compose outreach_draft emails server-side so the preview
            // card shows real, editable subject + body (rather than the
            // user blindly approving "outreach for prospect X" and only
            // seeing the result in the approval queue).
            await preComposeOutreachDrafts(parsed.data, user.companyId)
            response = `I'll set up: ${parsed.data.summary}. Review the preview below and hit Apply when ready.`
            attachments = [
              {
                type: 'proposed_action',
                data: { set: parsed.data, userPrompt: message },
              },
            ]
          } else {
            // clarification
            response = parsed.data.question
            attachments = [{ type: 'clarification', data: parsed.data }]
          }
        } catch (parseErr: any) {
          console.error('[AI Chat] Failed to parse tool call:', parseErr)
          response =
            "Hmm, I had trouble turning that into a concrete change. Could you rephrase what you'd like to do?"
        }
      } else {
        // Plain text answer. Catch hallucinated "I did it" phrases — Cassie
        // sometimes claims success in prose without calling propose_action_chain.
        response = detectAndRewriteHallucination(terminalResult.text, writeToolWasCalled)
      }
    } else {
      response = await sendChatMessage(enhancedMessage, undefined, {
        systemPrompt: undefined,
      })
    }

    const responseTime = Date.now() - startTime
    console.log('[AI Chat] Got response from Gemini in', responseTime, 'ms')

    // Save user message to conversation
    const userMessage = await saveMessage({
      conversationId,
      role: 'user',
      content: message,
      language: detectedLanguage,
      intent: classification.intent,
      confidence: classification.confidence,
      timeframe: classification.timeframe,
    })

    // Save AI response to conversation
    const assistantMessage = await saveMessage({
      conversationId,
      role: 'assistant',
      content: response,
      language: detectedLanguage,
      aiModel: GEMINI_MODEL_ID,
      responseTime,
    })

    console.log('[AI Chat] Messages saved to conversation')

    // For text-answer turns, run the existing rich-attachments generator
    // (charts/tables). Action/clarification turns supply their own attachment.
    if (attachments.length === 0 && businessContext) {
      attachments = generateAttachments(
        classification.intent,
        businessContext,
        message
      )
    }

    console.log('[AI Chat] Generated', attachments.length, 'attachments')

    return NextResponse.json({
      success: true,
      response,
      attachments,
      conversationId,
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
      timestamp: new Date().toISOString(),
      language: detectedLanguage,
      classification: {
        intent: classification.intent,
        confidence: classification.confidence,
        timeframe: classification.timeframe,
      },
    })
  } catch (error: any) {
    console.error('AI Chat Error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
    })

    // Only return the "not configured" message when the API key is genuinely
    // missing — otherwise the route was masking real downstream errors as a
    // config problem.
    if (
      typeof error.message === 'string' &&
      /GEMINI_API_KEY not configured/i.test(error.message)
    ) {
      return NextResponse.json(
        {
          error:
            'AI assistant not configured. Please add GOOGLE_GEMINI_API_KEY to your environment variables.',
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to get AI response',
        details: error.message,
        errorType: error.constructor.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'AI Chat API',
    model: 'Gemini 2.0 Flash',
  })
}

// ============================================================================
// Search-tool dispatcher (read-only lookups Cassie can call mid-turn when a
// record isn't visible in ACTION CONTEXT).
// ============================================================================

async function executeSearchTool(
  name: string,
  args: Record<string, unknown>,
  scope: { companyId: string; branchId: string | null }
): Promise<{ results: Array<Record<string, unknown>>; count: number; truncated: boolean; queriesUsed: string[] }> {
  // Accept either `query` (single string) or `queries` (array). Normalize to
  // a unique, trimmed list. Cap at 10 queries per call to avoid abuse.
  const rawQueries: string[] = []
  if (typeof args.query === 'string' && args.query.trim()) rawQueries.push(args.query.trim())
  if (Array.isArray(args.queries)) {
    for (const q of args.queries) {
      if (typeof q === 'string' && q.trim()) rawQueries.push(q.trim())
    }
  }
  const queries = Array.from(new Set(rawQueries)).slice(0, 10)
  const rawLimit = Number(args.limit ?? 15)
  // When batching, allow more matches per call (up to 60) so all queries can
  // fit in one response. Single-query calls stay at the original 25 cap.
  const perCallCap = queries.length > 1 ? 60 : 25
  const limit = Math.max(1, Math.min(perCallCap, Number.isFinite(rawLimit) ? Math.round(rawLimit) : 15))
  if (queries.length === 0) {
    return { results: [], count: 0, truncated: false, queriesUsed: [] }
  }

  const clientScope = {
    companyId: scope.companyId,
    deletedAt: null,
    ...(scope.branchId ? { branchId: scope.branchId } : {}),
  }

  if (name === 'search_prospects') {
    const rows = await prisma.prospect.findMany({
      where: {
        companyId: scope.companyId,
        deletedAt: null,
        OR: queries.flatMap((q) => [
          { companyName: { contains: q, mode: 'insensitive' as const } },
          { legalName: { contains: q, mode: 'insensitive' as const } },
        ]),
      },
      select: {
        id: true,
        companyName: true,
        legalName: true,
        status: true,
        priority: true,
        industry: true,
      },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      take: limit + 1,
    })
    const truncated = rows.length > limit
    const results = rows.slice(0, limit).map((p) => ({
      id: p.id,
      companyName: p.companyName,
      legalName: p.legalName,
      status: p.status,
      priority: p.priority,
      industry: p.industry,
    }))
    return { results, count: results.length, truncated, queriesUsed: queries }
  }

  if (name === 'search_clients') {
    const rows = await prisma.client.findMany({
      where: {
        ...clientScope,
        OR: queries.flatMap((q) => [
          { name: { contains: q, mode: 'insensitive' as const } },
          { legalName: { contains: q, mode: 'insensitive' as const } },
          { billingEmail: { contains: q, mode: 'insensitive' as const } },
        ]),
      },
      select: {
        id: true,
        name: true,
        legalName: true,
        status: true,
        billingEmail: true,
      },
      orderBy: { name: 'asc' },
      take: limit + 1,
    })
    const truncated = rows.length > limit
    const results = rows.slice(0, limit).map((c) => ({
      id: c.id,
      name: c.name,
      legalName: c.legalName,
      status: c.status,
      billingEmail: c.billingEmail,
    }))
    return { results, count: results.length, truncated, queriesUsed: queries }
  }

  if (name === 'search_locations') {
    const rows = await prisma.location.findMany({
      where: {
        client: clientScope,
        deletedAt: null,
        OR: queries.map((q) => ({ name: { contains: q, mode: 'insensitive' as const } })),
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        clientId: true,
        client: { select: { name: true } },
      },
      orderBy: [{ client: { name: 'asc' } }, { name: 'asc' }],
      take: limit + 1,
    })
    const truncated = rows.length > limit
    const results = rows.slice(0, limit).map((l) => ({
      id: l.id,
      name: l.name,
      isActive: l.isActive,
      clientId: l.clientId,
      clientName: l.client.name,
    }))
    return { results, count: results.length, truncated, queriesUsed: queries }
  }

  return { results: [], count: 0, truncated: false, queriesUsed: queries }
}

// ============================================================================
// Hallucination guard — Cassie has occasionally claimed she made a change in
// plain text without calling propose_action_chain. The only legit way for a
// change to happen is the user clicking Apply on a preview card; any
// "I successfully X" phrasing without a tool call is a lie. Rewrite to be
// honest.
// ============================================================================

// Verbs that, in past tense, imply a write that only ever happens after Apply.
// Kept as a regex source so we can compose into multiple patterns.
const ACTION_VERB_RE = String.raw`(?:added|created|saved|drafted|scheduled|sent|deleted|updated|removed|composed|generated|set\s+up|set\s+her\s+up|logged|put|placed|filed|stored|dropped|made|wrote|wrote\s+up|drew\s+up|drawn\s+up|handled|knocked\s+out|whipped\s+up|booked|queued|fired\s+off|shipped)`

const HALLUCINATION_PATTERNS: RegExp[] = [
  // "I added/created/sent/..."  — bare past tense, optional adverbs.
  // The `(?:\s+\w+){0,3}` allows up to three intervening words like "just",
  // "already", "successfully", "just now", "officially".
  new RegExp(String.raw`\bI(?:'ve|\s+have|\s+just|'ve\s+just|\s+already|'ve\s+already)?(?:\s+\w+){0,3}\s+${ACTION_VERB_RE}\b`, 'i'),
  // "Done — I've added X" / "Done, I added X"
  new RegExp(String.raw`\bDone[—,\-\s]+I(?:'ve|\s+have)?\s+${ACTION_VERB_RE}\b`, 'i'),
  // "is now/officially/safely/sitting <state>" — requires a "recently-
  // completed" adverb so legitimate factual statements like "it's in your
  // dashboard" (no recency marker) don't false-positive.
  /\b(?:is|are|it's|it\s+is)\s+(?:now|officially|safely|already|sitting|locked\s+in|all\s+set|ready)\s+(?:saved|logged|set\s+up|scheduled|drafted|created|added|sent|in\s+your|in\s+the|ready\s+to\s+go|done|live|good\s+to\s+go|live\s+in\s+your|drop[a-z]*\s+in|to\s+go)\b/i,
  // "I have got the draft right here" / "I've got that ready"
  /\bI(?:'ve|\s+have)?\s+got\s+(?:the|that|your|it)\b/i,
  // "I'll go ahead and X" / "let me X" — future-tense commitments that imply
  // direct action without the tool call.
  new RegExp(String.raw`\b(?:I'll|I\s+will|Let\s+me)\s+(?:go\s+ahead\s+and\s+)?${ACTION_VERB_RE}\b`, 'i'),
  // "Boom, done!" / "Boom! Done." — Cassie's signature confirmation phrasing
  // for actions she didn't take.
  /\bBoom[!,.\s]+done\b/i,
  // "I'll make sure it gets X" / "I will make sure it is X"
  /\b(?:I'll|I\s+will)\s+make\s+sure\s+(?:it|that|this)\s+(?:gets|is)\s+(?:sent|saved|created|added|drafted|delivered)\b/i,
]

// ============================================================================
// Pre-compose outreach_draft actions — runs the email composer for each
// outreach_draft create in the proposed chain, so the preview card shows the
// actual subject + body (editable) before the user clicks Apply. Uses the
// composeInstructions/tone/purpose fields Cassie set. Failures don't abort
// the whole chain — we leave subject/body blank on the action so the user
// still sees the card and can edit manually.
// ============================================================================

async function preComposeOutreachDrafts(
  set: ProposedActionSet,
  companyId: string
): Promise<void> {
  const targets = set.actions.filter(
    (a) => a.entity === 'outreach_draft' && a.kind === 'create'
  )
  if (targets.length === 0) return

  await Promise.all(
    targets.map(async (action) => {
      try {
        const fieldsByKey = new Map<string, ActionField>(action.fields.map((f) => [f.key, f]))
        const prospectId = readStringField(fieldsByKey, 'prospectId')
        if (!prospectId) return
        const tone = (readStringField(fieldsByKey, 'tone') || 'friendly') as any
        const purposeRaw = readStringField(fieldsByKey, 'purpose') || 'cold_outreach'
        const purpose = (['cold_outreach', 'follow_up', 're_engagement'].includes(purposeRaw)
          ? purposeRaw
          : 'cold_outreach') as any
        const channel = (readStringField(fieldsByKey, 'channel') || 'email') as any
        const composeInstructions = readStringField(fieldsByKey, 'composeInstructions') || undefined

        const prospect = await prisma.prospect.findFirst({
          where: { id: prospectId, companyId, deletedAt: null },
          include: { contacts: true },
        })
        if (!prospect) return

        const prospectData: ProspectData = {
          companyName: prospect.companyName,
          businessType: prospect.businessType || undefined,
          industry: prospect.industry || undefined,
          address: (prospect.address as any) || undefined,
          website: prospect.website || undefined,
          priceLevel: prospect.priceLevel || undefined,
          contacts: prospect.contacts.map((c) => ({
            firstName: c.firstName,
            lastName: c.lastName,
            title: c.title || undefined,
            email: c.email || undefined,
          })),
          notes: prospect.notes || undefined,
          aiScore: prospect.aiScore || undefined,
          aiScoreReason: prospect.aiScoreReason || undefined,
        }

        const generated = await generateOutreachMessage({
          channel,
          prospect: prospectData,
          tone,
          purpose,
          customInstructions: composeInstructions,
        })

        upsertField(action.fields, {
          key: 'subject',
          label: 'Subject',
          type: 'text',
          newValue: generated.subject || '',
          helper: 'Auto-composed; edit before applying.',
        })
        upsertField(action.fields, {
          key: 'body',
          label: 'Body',
          type: 'textarea',
          newValue: generated.body || '',
          helper: 'Auto-composed; edit before applying.',
        })
      } catch (err) {
        console.warn(
          '[AI Chat] preComposeOutreachDrafts: composer failed for action',
          action.id,
          err
        )
        // Leave the action without subject/body — the user sees the card and
        // can either edit manually or cancel.
      }
    })
  )
}

function readStringField(map: Map<string, ActionField>, key: string): string {
  const f = map.get(key)
  if (!f) return ''
  const v = f.newValue
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

function upsertField(fields: ActionField[], field: ActionField): void {
  const idx = fields.findIndex((f) => f.key === field.key)
  if (idx >= 0) {
    fields[idx] = { ...fields[idx], ...field }
  } else {
    fields.push(field)
  }
}

function detectAndRewriteHallucination(text: string, toolWasCalled: boolean): string {
  console.log(
    '[AI Chat] Running hallucination detector. writeToolWasCalled=',
    toolWasCalled,
    'text starts:',
    (text || '').slice(0, 80)
  )
  if (toolWasCalled) return text
  if (!text) return text
  for (const pattern of HALLUCINATION_PATTERNS) {
    if (pattern.test(text)) {
      console.warn(
        '[AI Chat] Hallucination detected — Cassie claimed action without tool call. Pattern:',
        pattern.toString(),
        'Original text:',
        text.slice(0, 300)
      )
      return "Hmm, something didn't connect there — I wasn't able to actually make that change. Could you rephrase what you'd like to do? (No changes were made.)"
    }
  }
  return text
}
