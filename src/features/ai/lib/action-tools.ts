// Tool definitions Gemini can call, plus the mapping from the model's
// tool-call output to our internal ProposedAction structures.
//
// Design notes:
// - Two tools: `propose_action_chain` and `ask_clarification`. If neither is
//   called, the response is a plain text answer (question path).
// - Field values arrive as a JSON-encoded string per action (`field_values_json`).
//   The schema reference for each entity is given in the system prompt; we
//   validate field keys against an allowlist on receipt.
// - Chained creates reference earlier actions via `"$ref:<actionId>"` sentinels
//   in id-typed fields (e.g. client_id). The executor substitutes at apply time.
// - Field labels/types/options live in FIELD_META so the preview UI can render
//   each field with the right control without per-entity branching.

import { SchemaType } from '@google/generative-ai'
import { EXPENSE_CATEGORIES, EXPENSE_TYPES } from '@/lib/financials'
import {
  ACTION_REF_PREFIX,
  type ActionEntity,
  type ActionField,
  type ActionTurnResponse,
  type FieldOption,
  type FieldType,
  type ProposedAction,
  type ProposedActionSet,
  type ProposedClarification,
} from '../types/action-types'

// ============================================================================
// Gemini function-declaration schemas
// ============================================================================

const PAYMENT_TERMS_OPTIONS = ['NET_15', 'NET_30', 'DUE_ON_RECEIPT']
const PAYMENT_METHOD_OPTIONS = ['ach', 'credit_card', 'check']
const CLIENT_STATUS_OPTIONS = ['active', 'inactive', 'churned']
const CATEGORY_VALUES = EXPENSE_CATEGORIES.map((c) => c.value)
const EXPENSE_TYPE_VALUES = EXPENSE_TYPES.map((t) => t.value)

export const ACTION_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'propose_action_chain',
        description:
          'Propose one or more record changes the user has requested. The user will see a preview and confirm before anything is written. ' +
          'Use this when the user wants to CREATE or UPDATE a client, location, service agreement, or recurring expense. ' +
          'For an UPDATE, set target_id to the id of the record being changed. ' +
          'For chained creates that reference earlier ones in the same chain (e.g. a new client gets a new location), reference the earlier action by id with "$ref:<id>" inside the field_values_json (e.g. {"client_id":"$ref:a1"}).',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            summary: {
              type: SchemaType.STRING,
              description: 'One short line describing the whole proposed change.',
            },
            derived: {
              type: SchemaType.STRING,
              description:
                'Optional one-line insight to show in the preview, e.g. "Profit $2,900/mo · margin 44.6%". Omit if not relevant.',
            },
            actions: {
              type: SchemaType.ARRAY,
              description:
                'One ProposedAction per record change, in execution order. Use short stable ids like "a1", "a2".',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: {
                    type: SchemaType.STRING,
                    description:
                      'Short unique id within this chain, e.g. "a1". Used as the reference target for chained creates.',
                  },
                  kind: {
                    type: SchemaType.STRING,
                    enum: ['create', 'update'],
                    format: 'enum',
                    description: '"create" for new records, "update" for changes to existing records.',
                  },
                  entity: {
                    type: SchemaType.STRING,
                    enum: ['client', 'location', 'service_agreement', 'recurring_expense'],
                    format: 'enum',
                    description: 'Which record type this action affects.',
                  },
                  target_id: {
                    type: SchemaType.STRING,
                    description:
                      'Required when kind="update". The id of the existing record (look it up in ACTION CONTEXT). Omit for creates.',
                  },
                  target_label: {
                    type: SchemaType.STRING,
                    description:
                      'Human-readable description shown in the preview, e.g. "Horseshoe Bay service agreement" or "New client: Hill Country Properties".',
                  },
                  field_values_json: {
                    type: SchemaType.STRING,
                    description:
                      'JSON object string of the field values to write. Keys must match the entity field names (see SYSTEM PROMPT for the schema per entity). For updates, include only the fields that should change. For chained creates use "$ref:<id>" for id-typed fields.',
                  },
                },
                required: ['id', 'kind', 'entity', 'target_label', 'field_values_json'],
              },
            },
          },
          required: ['summary', 'actions'],
        },
      },
      {
        name: 'ask_clarification',
        description:
          'Use when the user\'s request is ambiguous and you need to ask a follow-up question before proposing actions. ' +
          'For example: two clients match the name they mentioned, or a required field is missing. Optionally include short button choices to make the answer one click.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            question: {
              type: SchemaType.STRING,
              description: 'The clarifying question to ask, in one short sentence.',
            },
            choices: {
              type: SchemaType.ARRAY,
              description: 'Optional answer buttons. Keep labels short.',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: { type: SchemaType.STRING, description: 'Short stable id.' },
                  label: { type: SchemaType.STRING, description: 'User-facing label.' },
                  hint: { type: SchemaType.STRING, description: 'Optional secondary text.' },
                },
                required: ['id', 'label'],
              },
            },
          },
          required: ['question'],
        },
      },
    ],
  },
] as const

// ============================================================================
// Field metadata — drives the preview UI for each entity's fields
// ============================================================================

interface FieldMeta {
  label: string
  type: FieldType
  options?: FieldOption[]
  helper?: string
}

function selectOptions(values: string[]): FieldOption[] {
  return values.map((v) => ({ value: v, label: v }))
}

const PAYMENT_TERMS_FIELD_OPTIONS: FieldOption[] = [
  { value: 'NET_15', label: 'Net 15' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
]

const PAYMENT_METHOD_FIELD_OPTIONS: FieldOption[] = [
  { value: 'ach', label: 'ACH' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'check', label: 'Check' },
]

const CLIENT_STATUS_FIELD_OPTIONS: FieldOption[] = selectOptions(CLIENT_STATUS_OPTIONS)
const CATEGORY_FIELD_OPTIONS: FieldOption[] = EXPENSE_CATEGORIES.map((c) => ({
  value: c.value,
  label: c.label,
}))
const EXPENSE_TYPE_FIELD_OPTIONS: FieldOption[] = EXPENSE_TYPES.map((t) => ({
  value: t.value,
  label: t.label,
}))

const FIELD_META: Record<ActionEntity, Record<string, FieldMeta>> = {
  client: {
    name: { label: 'Name', type: 'text' },
    legalName: { label: 'Legal Name', type: 'text' },
    billingEmail: { label: 'Billing Email', type: 'text' },
    phone: { label: 'Phone', type: 'text' },
    paymentTerms: { label: 'Payment Terms', type: 'select', options: PAYMENT_TERMS_FIELD_OPTIONS },
    preferredPaymentMethod: {
      label: 'Preferred Payment Method',
      type: 'select',
      options: PAYMENT_METHOD_FIELD_OPTIONS,
    },
    status: { label: 'Status', type: 'select', options: CLIENT_STATUS_FIELD_OPTIONS },
    taxExempt: { label: 'Tax Exempt', type: 'boolean' },
    parentClientId: { label: 'Parent Client', type: 'text', helper: 'Client id of the parent organization' },
    notes: { label: 'Notes', type: 'textarea' },
  },
  location: {
    clientId: { label: 'Client', type: 'text', helper: 'Client id this location belongs to' },
    name: { label: 'Name', type: 'text' },
    street: { label: 'Street', type: 'text' },
    city: { label: 'City', type: 'text' },
    state: { label: 'State', type: 'text' },
    zip: { label: 'ZIP', type: 'text' },
    accessInstructions: { label: 'Access Instructions', type: 'textarea' },
    serviceNotes: { label: 'Service Notes', type: 'textarea' },
    painPoints: { label: 'Pain Points', type: 'textarea' },
    isActive: { label: 'Active', type: 'boolean' },
  },
  service_agreement: {
    clientId: { label: 'Client', type: 'text', helper: 'Client id (required for creates)' },
    locationId: { label: 'Location', type: 'text', helper: 'Location id (required for creates)' },
    description: { label: 'Description', type: 'text' },
    monthlyAmount: { label: 'Monthly Revenue', type: 'currency' },
    monthlyLaborCost: { label: 'Labor Cost', type: 'currency' },
    monthlyMaterialCost: { label: 'Material Cost', type: 'currency' },
    monthlyOtherCost: { label: 'Other Cost', type: 'currency' },
    billingDay: { label: 'Billing Day', type: 'number', helper: '1–28' },
    paymentTerms: { label: 'Payment Terms', type: 'select', options: PAYMENT_TERMS_FIELD_OPTIONS },
    startDate: { label: 'Start Date', type: 'date' },
    endDate: { label: 'End Date', type: 'date' },
  },
  recurring_expense: {
    name: { label: 'Name', type: 'text' },
    category: { label: 'Category', type: 'select', options: CATEGORY_FIELD_OPTIONS },
    expenseType: { label: 'Type', type: 'select', options: EXPENSE_TYPE_FIELD_OPTIONS },
    monthlyAmount: { label: 'Monthly Amount', type: 'currency' },
    vendor: { label: 'Vendor', type: 'text' },
    paymentMethod: { label: 'Payment Method', type: 'text' },
    billingDay: { label: 'Billing Day', type: 'number', helper: '1–31' },
    startDate: { label: 'Start Date', type: 'date' },
    endDate: { label: 'End Date', type: 'date' },
    isActive: { label: 'Active', type: 'boolean' },
    notes: { label: 'Notes', type: 'textarea' },
  },
}

export const ALLOWED_FIELDS: Record<ActionEntity, string[]> = {
  client: Object.keys(FIELD_META.client),
  location: Object.keys(FIELD_META.location),
  service_agreement: Object.keys(FIELD_META.service_agreement),
  recurring_expense: Object.keys(FIELD_META.recurring_expense),
}

// ============================================================================
// System-prompt addendum — describes the tool surface to the LLM
// ============================================================================

export function actionToolsSystemPromptAddendum(): string {
  return `
You have access to two tools for taking actions in the user's business records:

1. **propose_action_chain** — propose one or more record changes (CREATE or UPDATE) for
   the user to preview and confirm. NEVER explain the change in prose AND call the tool;
   just call the tool. The preview is shown automatically.

2. **ask_clarification** — when the user's request is ambiguous (e.g. two clients
   match a name) or missing a required field, ask a short follow-up question.

If the user is asking a QUESTION (about their business or anything else), respond
with plain text — do not call any tool.

When you call propose_action_chain, use these exact field keys per entity. Use the
ids from the ACTION CONTEXT block verbatim (do not invent ids). For chained creates,
reference earlier actions with "${ACTION_REF_PREFIX}<id>" (e.g. {"client_id":"${ACTION_REF_PREFIX}a1"}).

### entity = "client"
Allowed fields: ${ALLOWED_FIELDS.client.join(', ')}.
- paymentTerms enum: ${PAYMENT_TERMS_OPTIONS.join(' | ')}
- preferredPaymentMethod enum: ${PAYMENT_METHOD_OPTIONS.join(' | ')}
- status enum: ${CLIENT_STATUS_OPTIONS.join(' | ')}
- taxExempt: boolean

### entity = "location"
Allowed fields: ${ALLOWED_FIELDS.location.join(', ')}.
- For creates, clientId is required (use "${ACTION_REF_PREFIX}<id>" if it's a chained-create from a new client).
- Address is flat: street, city, state, zip (separate fields).
- isActive: boolean

### entity = "service_agreement"
Allowed fields: ${ALLOWED_FIELDS.service_agreement.join(', ')}.
- For creates, clientId, locationId, description, monthlyAmount, and startDate are required.
- monthlyAmount, monthlyLaborCost, monthlyMaterialCost, monthlyOtherCost: numbers (dollars).
- billingDay: integer 1-28.
- startDate, endDate: ISO date strings (YYYY-MM-DD). If user says "today", use today's date.
- paymentTerms enum: ${PAYMENT_TERMS_OPTIONS.join(' | ')}.

### entity = "recurring_expense"
Allowed fields: ${ALLOWED_FIELDS.recurring_expense.join(', ')}.
- For creates, name and monthlyAmount are required.
- category enum: ${CATEGORY_VALUES.join(' | ')}. Default to "other" if unsure.
- expenseType enum: ${EXPENSE_TYPE_VALUES.join(' | ')}. Default to "operating". Use "owner_draw" only for owner pay/distributions.
- billingDay: integer 1-31.
- isActive: boolean.

### General rules
- Always include a target_id for kind="update", looked up from ACTION CONTEXT.
- For creates, omit target_id.
- target_label is a short human description shown in the preview (not sent to the API).
- field_values_json must be a JSON string, e.g. '{"monthlyAmount":8000}'.
- Never invent ids — use only ids present in ACTION CONTEXT, or use "${ACTION_REF_PREFIX}<actionId>" for chained creates.
- If the user wants to delete or deactivate something, set isActive=false (DELETE is not available yet).
`.trim()
}

// ============================================================================
// Parsing Gemini tool calls into our internal types
// ============================================================================

interface RawFunctionCall {
  name: string
  args: Record<string, unknown>
}

/**
 * Take Gemini's tool-call output and return either a ProposedActionSet (apply
 * flow) or a ProposedClarification (ask back), or null if no tool was called
 * (text answer). Throws on malformed input — the chat route catches and
 * responds with a friendly error.
 */
export function parseToolCall(call: RawFunctionCall): ActionTurnResponse {
  if (call.name === 'ask_clarification') {
    return { kind: 'clarify', data: parseAskClarification(call.args) }
  }
  if (call.name === 'propose_action_chain') {
    return { kind: 'actions', data: parseProposeActionChain(call.args) }
  }
  throw new Error(`Unknown tool call: ${call.name}`)
}

function parseAskClarification(args: Record<string, unknown>): ProposedClarification {
  const question = String(args.question ?? '').trim()
  if (!question) throw new Error('ask_clarification: empty question')
  const rawChoices = Array.isArray(args.choices) ? args.choices : []
  const choices = rawChoices
    .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
    .map((c) => ({
      id: String(c.id ?? ''),
      label: String(c.label ?? ''),
      hint: c.hint == null ? undefined : String(c.hint),
    }))
    .filter((c) => c.id && c.label)
  return { question, choices: choices.length > 0 ? choices : undefined }
}

function parseProposeActionChain(args: Record<string, unknown>): ProposedActionSet {
  const summary = String(args.summary ?? '').trim() || 'Proposed change'
  const derived = args.derived == null ? undefined : String(args.derived)
  const rawActions = Array.isArray(args.actions) ? args.actions : []
  if (rawActions.length === 0) {
    throw new Error('propose_action_chain: no actions provided')
  }
  const actions: ProposedAction[] = rawActions.map((raw, i) => {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error(`propose_action_chain: action ${i} is not an object`)
    }
    const a = raw as Record<string, unknown>
    const id = String(a.id ?? '').trim() || `a${i + 1}`
    const kind = String(a.kind ?? '')
    if (kind !== 'create' && kind !== 'update') {
      throw new Error(`Action ${id}: kind must be 'create' or 'update'`)
    }
    const entity = String(a.entity ?? '') as ActionEntity
    if (!Object.prototype.hasOwnProperty.call(FIELD_META, entity)) {
      throw new Error(`Action ${id}: unknown entity '${entity}'`)
    }
    const targetId =
      kind === 'update' ? String(a.target_id ?? '').trim() : undefined
    if (kind === 'update' && !targetId) {
      throw new Error(`Action ${id}: target_id required for updates`)
    }
    const targetLabel = String(a.target_label ?? '').trim() || `${kind} ${entity}`
    const fieldValues = parseFieldValuesJson(String(a.field_values_json ?? '{}'))
    const fields = buildActionFields(entity, fieldValues)
    return { id, kind, entity, targetId, targetLabel, fields }
  })
  return { summary, actions, derived }
}

function parseFieldValuesJson(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw)
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
      throw new Error('field_values_json must be a JSON object')
    }
    return v as Record<string, unknown>
  } catch (e: any) {
    throw new Error(`Invalid field_values_json: ${e.message}`)
  }
}

/**
 * Map a parsed field-values record to typed ActionFields, dropping any keys
 * not in the entity's allowlist. (The LLM is told the schema, but we
 * defensively filter.) currentValue is left undefined — the chat route can
 * fill it in from the existing record for updates, if/when it has the record.
 */
function buildActionFields(
  entity: ActionEntity,
  values: Record<string, unknown>
): ActionField[] {
  const meta = FIELD_META[entity]
  const out: ActionField[] = []
  for (const [key, value] of Object.entries(values)) {
    const m = meta[key]
    if (!m) continue // silently drop unknown fields
    out.push({
      key,
      label: m.label,
      type: m.type,
      newValue: coerceFieldValue(value, m.type),
      options: m.options,
      helper: m.helper,
    })
  }
  return out
}

/**
 * Light coercion only — the LLM is told to emit appropriate types, and the
 * preview lets the user fix anything wrong. We just normalize obvious things
 * (string "true" → true, string "100" for number → 100).
 */
function coerceFieldValue(value: unknown, type: FieldType): ActionField['newValue'] {
  if (value === null || value === undefined) return null
  switch (type) {
    case 'boolean':
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') return value.toLowerCase() === 'true'
      return Boolean(value)
    case 'number':
    case 'currency': {
      if (typeof value === 'number') return value
      const n = parseFloat(String(value))
      return Number.isFinite(n) ? n : null
    }
    case 'date':
    case 'text':
    case 'textarea':
    case 'select':
    default:
      return String(value)
  }
}
