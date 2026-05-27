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
      {
        name: 'search_prospects',
        description:
          'Search prospects by company name when they are NOT visible in ACTION CONTEXT. ' +
          'PREFER passing all the names you need to look up in `queries` (an array) — one call returns matches for everything, instead of you burning a turn per name. ' +
          'Returns matches with id, companyName, legalName, status, priority, industry.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            queries: {
              type: SchemaType.ARRAY,
              description:
                'PREFERRED: array of name substrings to match in one call (e.g. ["Oribellos", "Skybox", "Community Kitchen"]). Use this when looking up multiple prospects.',
              items: { type: SchemaType.STRING },
            },
            query: {
              type: SchemaType.STRING,
              description:
                'Single name substring (case-insensitive). Use ONLY when looking up exactly one prospect; otherwise prefer `queries`.',
            },
            limit: {
              type: SchemaType.NUMBER,
              description: 'Max matches to return per query (default 15, max 25).',
            },
          },
        },
      },
      {
        name: 'search_clients',
        description:
          'Search clients by name/legal name/billing email when NOT visible in ACTION CONTEXT. ' +
          'PREFER passing all names in `queries` (array) to look up many at once. Returns id, name, status.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            queries: {
              type: SchemaType.ARRAY,
              description: 'PREFERRED: array of name substrings to match in one call.',
              items: { type: SchemaType.STRING },
            },
            query: {
              type: SchemaType.STRING,
              description: 'Single name substring (case-insensitive). Prefer `queries` when looking up multiple.',
            },
            limit: {
              type: SchemaType.NUMBER,
              description: 'Max matches to return (default 15, max 25).',
            },
          },
        },
      },
      {
        name: 'search_locations',
        description:
          'Search locations by name when NOT visible in ACTION CONTEXT. ' +
          'PREFER passing all names in `queries` (array). Returns id, name, clientId, clientName.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            queries: {
              type: SchemaType.ARRAY,
              description: 'PREFERRED: array of name substrings to match in one call.',
              items: { type: SchemaType.STRING },
            },
            query: {
              type: SchemaType.STRING,
              description: 'Single name substring (case-insensitive). Prefer `queries` when looking up multiple.',
            },
            limit: {
              type: SchemaType.NUMBER,
              description: 'Max matches to return (default 15, max 25).',
            },
          },
        },
      },
    ],
  },
] as const

/** Names of the read-only search tools, exposed for the chat route to dispatch on. */
export const SEARCH_TOOL_NAMES = ['search_prospects', 'search_clients', 'search_locations'] as const
export type SearchToolName = (typeof SEARCH_TOOL_NAMES)[number]
export function isSearchToolName(name: string): name is SearchToolName {
  return (SEARCH_TOOL_NAMES as readonly string[]).includes(name)
}

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

// ---- Tier 2 enums ---------------------------------------------------------
const PROSPECT_STATUS_OPTIONS = [
  'new',
  'researching',
  'contacted',
  'engaged',
  'qualified',
  'proposal_sent',
  'won',
  'lost',
  'nurturing',
]
const PROSPECT_PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent']
const PROSPECT_SOURCE_OPTIONS = [
  'manual',
  'csv_import',
  'ai_discovery',
  'referral',
  'website',
  'meta',
  'other',
]
const ISSUE_CATEGORY_OPTIONS = ['quality', 'equipment', 'communication', 'safety', 'other']
const ISSUE_SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical']
const ISSUE_STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed']
const CONTACT_ROLE_OPTIONS = ['primary', 'billing', 'operations', 'other']
const OUTREACH_CHANNEL_OPTIONS = ['email', 'phone', 'sms', 'linkedin', 'instagram_dm']
const OUTREACH_TONE_OPTIONS = ['friendly', 'professional', 'casual', 'warm']
const OUTREACH_PURPOSE_OPTIONS = ['cold_outreach', 'follow_up', 're_engagement']

const PROSPECT_STATUS_FIELD_OPTIONS = selectOptions(PROSPECT_STATUS_OPTIONS)
const PROSPECT_PRIORITY_FIELD_OPTIONS = selectOptions(PROSPECT_PRIORITY_OPTIONS)
const PROSPECT_SOURCE_FIELD_OPTIONS = selectOptions(PROSPECT_SOURCE_OPTIONS)
const ISSUE_CATEGORY_FIELD_OPTIONS = selectOptions(ISSUE_CATEGORY_OPTIONS)
const ISSUE_SEVERITY_FIELD_OPTIONS = selectOptions(ISSUE_SEVERITY_OPTIONS)
const ISSUE_STATUS_FIELD_OPTIONS = selectOptions(ISSUE_STATUS_OPTIONS)
const CONTACT_ROLE_FIELD_OPTIONS = selectOptions(CONTACT_ROLE_OPTIONS)
const OUTREACH_CHANNEL_FIELD_OPTIONS = selectOptions(OUTREACH_CHANNEL_OPTIONS)
const OUTREACH_TONE_FIELD_OPTIONS = selectOptions(OUTREACH_TONE_OPTIONS)
const OUTREACH_PURPOSE_FIELD_OPTIONS: FieldOption[] = [
  { value: 'cold_outreach', label: 'Cold outreach' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 're_engagement', label: 'Re-engagement' },
]

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
  prospect: {
    companyName: { label: 'Company Name', type: 'text' },
    legalName: { label: 'Legal Name', type: 'text' },
    industry: { label: 'Industry', type: 'text' },
    businessType: { label: 'Business Type', type: 'text' },
    website: { label: 'Website', type: 'text' },
    phone: { label: 'Phone', type: 'text' },
    status: { label: 'Status', type: 'select', options: PROSPECT_STATUS_FIELD_OPTIONS },
    priority: { label: 'Priority', type: 'select', options: PROSPECT_PRIORITY_FIELD_OPTIONS },
    source: { label: 'Source', type: 'select', options: PROSPECT_SOURCE_FIELD_OPTIONS },
    sourceDetail: { label: 'Source Detail', type: 'text' },
    estimatedValue: { label: 'Estimated Value', type: 'currency' },
    estimatedSize: { label: 'Estimated Size', type: 'text' },
    employeeCount: { label: 'Employee Count', type: 'number' },
    annualRevenue: { label: 'Annual Revenue', type: 'currency' },
    priceLevel: { label: 'Price Level', type: 'text' },
    notes: { label: 'Notes', type: 'textarea' },
    lostReason: { label: 'Lost Reason', type: 'text' },
  },
  issue: {
    locationId: { label: 'Location', type: 'text', helper: 'Location id (required for create)' },
    title: { label: 'Title', type: 'text' },
    description: { label: 'Description', type: 'textarea' },
    category: { label: 'Category', type: 'select', options: ISSUE_CATEGORY_FIELD_OPTIONS },
    severity: { label: 'Severity', type: 'select', options: ISSUE_SEVERITY_FIELD_OPTIONS },
    status: { label: 'Status', type: 'select', options: ISSUE_STATUS_FIELD_OPTIONS },
    assignedToId: { label: 'Assigned To', type: 'text', helper: 'User id of assignee' },
    resolution: { label: 'Resolution', type: 'textarea' },
  },
  client_contact: {
    clientId: { label: 'Client', type: 'text', helper: 'Client id (required for all actions)' },
    firstName: { label: 'First Name', type: 'text' },
    lastName: { label: 'Last Name', type: 'text' },
    email: { label: 'Email', type: 'text' },
    phone: { label: 'Phone', type: 'text' },
    role: { label: 'Role', type: 'select', options: CONTACT_ROLE_FIELD_OPTIONS },
    isPortalUser: { label: 'Portal Access', type: 'boolean' },
  },
  location_assignment: {
    locationId: { label: 'Location', type: 'text', helper: 'Location id (required for create)' },
    userId: { label: 'Associate', type: 'text', helper: 'User id of the associate (required for create)' },
    monthlyPay: { label: 'Monthly Pay', type: 'currency' },
    startDate: { label: 'Start Date', type: 'date' },
    endDate: { label: 'End Date', type: 'date' },
    isActive: { label: 'Active', type: 'boolean' },
    estimatedHoursPerVisit: { label: 'Estimated Hours / Visit', type: 'number' },
    cleaningWindowStart: { label: 'Window Start', type: 'text', helper: 'HH:MM (e.g. 23:00)' },
    cleaningWindowEnd: { label: 'Window End', type: 'text', helper: 'HH:MM (e.g. 02:00)' },
    nightsPerWeek: { label: 'Nights / Week', type: 'number' },
  },
  checklist_template: {
    name: { label: 'Name', type: 'text' },
    nameEs: { label: 'Spanish Name', type: 'text' },
    description: { label: 'Description', type: 'textarea' },
    sections: {
      label: 'Sections',
      type: 'json',
      helper: 'Array of { id, name, items: [{ id, text }] }. Read-only preview.',
    },
    isActive: { label: 'Active', type: 'boolean' },
  },
  invoice: {
    clientId: { label: 'Client', type: 'text', helper: 'Client id (required for create)' },
    issueDate: { label: 'Issue Date', type: 'date' },
    dueDate: { label: 'Due Date', type: 'date' },
    taxAmount: { label: 'Tax Amount', type: 'currency' },
    notes: { label: 'Notes', type: 'textarea' },
    terms: { label: 'Terms', type: 'textarea' },
    status: { label: 'Status', type: 'text', helper: 'draft / sent / paid / void' },
    lineItems: {
      label: 'Line Items',
      type: 'json',
      helper: 'Array of { description, quantity, unitPrice }. Read-only preview.',
    },
  },
  outreach_draft: {
    prospectId: { label: 'Prospect', type: 'text', helper: 'Prospect id (required for create)' },
    composeInstructions: {
      label: 'Compose Instructions',
      type: 'textarea',
      helper: 'Free-text guidance for the composer: angle, tone notes, things to mention or avoid, length, etc. This is what shapes the email.',
    },
    tone: { label: 'Tone', type: 'select', options: OUTREACH_TONE_FIELD_OPTIONS },
    purpose: { label: 'Purpose', type: 'select', options: OUTREACH_PURPOSE_FIELD_OPTIONS },
    subject: { label: 'Subject', type: 'text', helper: 'Auto-composed; edit before applying.' },
    body: { label: 'Body', type: 'textarea', helper: 'Auto-composed; edit before applying.' },
    channel: { label: 'Channel', type: 'select', options: OUTREACH_CHANNEL_FIELD_OPTIONS },
    approvalStatus: { label: 'Approval', type: 'text', helper: 'pending / approved / rejected' },
  },
}

export const ALLOWED_FIELDS: Record<ActionEntity, string[]> = {
  client: Object.keys(FIELD_META.client),
  location: Object.keys(FIELD_META.location),
  service_agreement: Object.keys(FIELD_META.service_agreement),
  recurring_expense: Object.keys(FIELD_META.recurring_expense),
  prospect: Object.keys(FIELD_META.prospect),
  issue: Object.keys(FIELD_META.issue),
  client_contact: Object.keys(FIELD_META.client_contact),
  location_assignment: Object.keys(FIELD_META.location_assignment),
  checklist_template: Object.keys(FIELD_META.checklist_template),
  invoice: Object.keys(FIELD_META.invoice),
  outreach_draft: Object.keys(FIELD_META.outreach_draft),
}

// ============================================================================
// System-prompt addendum — describes the tool surface to the LLM
// ============================================================================

export function actionToolsSystemPromptAddendum(): string {
  return `
=== CRITICAL: HOW YOU MAKE CHANGES ===

You CANNOT directly create, update, delete, draft, save, schedule, send, or modify
ANYTHING yourself. You have no direct write access to the database. The ONLY way a
change happens is:
  1. You call propose_action_chain (or ask_clarification).
  2. The user sees a preview card in the chat.
  3. The user clicks Apply.
  4. Only then does the action actually run.

This means:
- NEVER write "I have successfully added/created/saved/drafted/scheduled X."
- NEVER write "Done — I've taken care of that."
- NEVER write "It is officially saved" or "It is sitting in your queue."
- If you find yourself wanting to write any of those phrases — STOP. Call the tool
  instead. A preview card IS your confirmation; you don't narrate it.
- If you cannot call the tool for some reason (missing info, record not in your
  context, ambiguous request), say so honestly: "I can't find X in my recent
  context — could you paste the id, or should I create it fresh?"

You have five tools — two that propose changes and three read-only search helpers:

1. **propose_action_chain** — propose one or more record changes (CREATE, UPDATE, or
   DELETE) for the user to preview and confirm. Whenever the user uses action verbs
   like add, create, update, change, edit, raise, lower, set, mark, assign, pause,
   activate, draft, schedule, delete, remove, void, cancel — call this tool.
   Don't also explain the change in prose; the preview is shown automatically.

2. **ask_clarification** — when the user's request is ambiguous (e.g. two records
   match a name, or a required field is missing), ask a short follow-up question
   with optional button choices.

3. **search_prospects(query, limit?)** — search by company name when the prospect
   isn't in ACTION CONTEXT.

4. **search_clients(query, limit?)** — search by name/legal name/billing email when
   the client isn't in ACTION CONTEXT.

5. **search_locations(query, limit?)** — search by name when the location isn't in
   ACTION CONTEXT.

If the user is asking a QUESTION (about their business, an opinion, casual chat),
respond with plain text — do not call any tool. Action verbs above always mean
"use a tool"; question words (what, how, when, why, who, show me, tell me) mean
"answer in text."

=== ABOUT THE ACTION CONTEXT BLOCK + WHEN TO SEARCH ===

The ACTION CONTEXT below shows the MOST RECENT slice of each record type, not
necessarily every record. Alex may have hundreds of prospects/clients/locations;
older or paginated ones are invisible to you in this block.

If the user mentions a specific record (e.g. "Test Hotel", "Lakeway Bistro") and
you DO NOT see it in ACTION CONTEXT:
  1. Call the matching search_* tool FIRST. Pass a substring of the name as the
     query (e.g. query: "Test Hotel" or just "Test"). You will get a function
     response back with the matches and their ids.
  2. If exactly one match is returned, use that id in your propose_action_chain
     call. Do NOT also narrate the search to the user; just proceed to propose.
  3. If multiple matches are returned, call ask_clarification with the candidates
     as button choices.
  4. If zero matches are returned, call ask_clarification and ask the user
     whether to create the record fresh.

**BATCH LOOKUPS — IMPORTANT**: When the user gives you MULTIPLE names to look
up (e.g. "draft emails for Oribellos, Allday Pizza, Skybox on 6th, Community
Kitchen"), DO NOT call search_prospects four separate times. Pass ALL the
names in a single call using the \`queries\` array:

  search_prospects({ queries: ["Oribellos", "Allday Pizza", "Skybox", "Community Kitchen"] })

This returns matches for all of them at once. You have a limited number of
turns per response; one batched search leaves room for the propose_action_chain
call. Multiple individual searches will burn your turn budget and the request
will fail.

After the batched search returns, match each result to its query by comparing
companyName/name fields. If a query had no match, ask_clarification about
just those (don't re-search). If all queries matched cleanly, go straight to
propose_action_chain with one action per prospect.

DO NOT silently substitute a different record. DO NOT invent ids. DO NOT claim
the record doesn't exist without searching first.

You can also use search_* tools proactively when answering questions if you need
to surface a record that isn't in ACTION CONTEXT — but for most chat turns the
ACTION CONTEXT block is enough.

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

### entity = "prospect"
Allowed fields: ${ALLOWED_FIELDS.prospect.join(', ')}.
- For creates, companyName is required.
- status enum: ${PROSPECT_STATUS_OPTIONS.join(' | ')}. Default "new".
- priority enum: ${PROSPECT_PRIORITY_OPTIONS.join(' | ')}. Default "medium".
- source enum: ${PROSPECT_SOURCE_OPTIONS.join(' | ')}. Default "manual".
- estimatedValue and annualRevenue are dollar numbers.

### entity = "issue"
Allowed fields: ${ALLOWED_FIELDS.issue.join(', ')}.
- For creates, locationId (look up from ACTION CONTEXT) and title are required.
- category enum: ${ISSUE_CATEGORY_OPTIONS.join(' | ')}. Default "other".
- severity enum: ${ISSUE_SEVERITY_OPTIONS.join(' | ')}. Default "medium".
- status enum: ${ISSUE_STATUS_OPTIONS.join(' | ')}. Default "open".
- To resolve an issue: set status="resolved" with a resolution.

### entity = "client_contact"
Allowed fields: ${ALLOWED_FIELDS.client_contact.join(', ')}.
- clientId is ALWAYS required (creates, updates, deletes) — it identifies which client's contact this is.
- For creates, firstName, lastName, and email are required.
- role enum: ${CONTACT_ROLE_OPTIONS.join(' | ')}. Default "primary".
- isPortalUser: boolean — if true, the contact gets portal access.

### entity = "location_assignment"
Allowed fields: ${ALLOWED_FIELDS.location_assignment.join(', ')}.
- For creates, locationId, userId, monthlyPay, and startDate are required.
- monthlyPay is a dollar number.
- cleaningWindowStart/End are 24-hour HH:MM strings (e.g. "23:00").
- isActive: boolean.

### entity = "checklist_template"
Allowed fields: ${ALLOWED_FIELDS.checklist_template.join(', ')}.
- For creates, name is required.
- sections is a nested array: [{ id, name, items: [{ id, text }] }]. Generate short id strings like "s1", "s1-i1". Place this in field_values_json as a real nested array (not a string).
- Example sections:
  [{"id":"s1","name":"Bathrooms","items":[{"id":"s1-i1","text":"Clean toilet"},{"id":"s1-i2","text":"Restock toilet paper"}]}]

### entity = "invoice"
Allowed fields: ${ALLOWED_FIELDS.invoice.join(', ')}.
- For creates, clientId and lineItems are required.
- lineItems is a nested array: [{ description, quantity, unitPrice, serviceAgreementId? }]. Quantity and unitPrice are numbers. Place this as a real nested array (not a string) in field_values_json.
- For updates, status enum: draft | sent | paid | void. Setting status="void" effectively cancels the invoice.

### entity = "outreach_draft"
Allowed fields: ${ALLOWED_FIELDS.outreach_draft.join(', ')}.
- For creates, **prospectId is required**. Look it up in ACTION CONTEXT or call search_prospects first.
- **composeInstructions** is the most important field — it shapes the email. Carry over the user's full intent verbatim or as a faithful rephrase: the angle (e.g. "follow up on a warm lead that came in 1-2 weeks ago"), things to mention ("we just got our new CRM dialed in"), things to avoid, length cues ("short and sweet"), and any specific call-to-action. The more of the user's actual guidance you preserve here, the better the email. If the user gave no specific guidance, pass a brief contextual description like "Initial cold outreach to introduce Urban Simple's nightly hospitality cleaning."
- **tone** enum: ${OUTREACH_TONE_OPTIONS.join(' | ')}. Default "friendly". Use "warm" when the user says "warm", "personal", or "really friendly"; "professional" when they say "formal" or "business-like"; "casual" when they say "chill" or "laid back".
- **purpose** enum: ${OUTREACH_PURPOSE_OPTIONS.join(' | ')}. Use "follow_up" whenever the user uses any of: "follow up", "follow-up", "follow them up", "circle back", "check in", "touch base again". Use "re_engagement" when the user says "re-engage", "wake up", "warm up an old prospect", "we lost touch". Use "cold_outreach" only for genuine first-touch (default if unclear).
- **channel** enum: ${OUTREACH_CHANNEL_OPTIONS.join(' | ')}. Default "email".
- **DO NOT set subject or body yourself.** The chat route runs the composer server-side after you propose, fills in subject + body using your composeInstructions, and shows the result in the preview card. The user can then edit either field before applying. If you write a subject/body inline, the composer will overwrite them — wasted work.
- For updates / rejections, target_id is the OutreachMessage id.

CRITICAL — DO NOT TYPE THE EMAIL IN CHAT. When the user asks you to draft an
outreach email (any phrasing like "draft an email", "write up an email",
"compose an outreach", "draft a follow-up", "put it in drafts"):
  - Call propose_action_chain with entity="outreach_draft", kind="create",
    and field_values_json containing prospectId + composeInstructions (+
    optional tone/purpose).
  - DO NOT also type out a "Subject:" + "Body:" block in your text response.
    The preview card will show the composed email; if you type it inline you
    are creating a fake confirmation.
  - DO NOT say "I have generated the email and saved it in the queue" —
    that's a lie. The user has to click Apply for anything to happen.
  - If you cannot find the prospect in ACTION CONTEXT and search_prospects
    returns nothing, call ask_clarification instead.

For BATCH outreach (e.g. "draft follow-ups for these four prospects"), put
ONE outreach_draft create per prospect into the SAME propose_action_chain
call. Reuse the same composeInstructions, tone, and purpose across all items
(they share the user's intent). The composer runs per-action so each email
still gets personalized to its specific prospect.

### General rules
- For kind="create", omit target_id.
- For kind="update" or kind="delete", set target_id to the existing record's id (look it up in ACTION CONTEXT).
- "delete" kind tells the executor to remove the record. The executor picks the right strategy per entity (hard delete, soft delete, deactivate, or void). The user just sees a destructive red preview.
- target_label is a short human description shown in the preview (not sent to the API).
- field_values_json must be a JSON string of an object; nested arrays/objects inside are fine.
- Never invent ids — use only ids present in ACTION CONTEXT, or use "${ACTION_REF_PREFIX}<actionId>" for chained creates.

### Batching
When the user lists multiple items in one request (e.g. "add prospects Lakeway Bistro, Hill Country Catering, and Austin Hotel" or "draft outreach emails to Test Hotel and Lakeway Bistro"), put ALL of them into a SINGLE propose_action_chain call as separate items in the actions array. Do NOT split into multiple turns. The preview card will render each one and Apply runs them in order.
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
    case 'json':
      // Preserve nested objects/arrays as-is; if a JSON string was emitted,
      // parse it back so the executor sends a real object.
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch {
          return value
        }
      }
      return value
    case 'date':
    case 'text':
    case 'textarea':
    case 'select':
    default:
      return String(value)
  }
}
