// Types for the chat's "smart actions" flow. The LLM proposes a set of
// ProposedActions; the user previews and (optionally) edits each field; on
// Apply, the action-executor walks the chain and calls the existing CRUD
// endpoints. The LLM never executes — it only proposes.

export type ActionEntity =
  | 'client'
  | 'location'
  | 'service_agreement'
  | 'recurring_expense'
  | 'prospect'
  | 'issue'
  | 'client_contact'
  | 'location_assignment'
  | 'checklist_template'
  | 'invoice'
  | 'outreach_draft'

export type ActionKind = 'create' | 'update' | 'delete'

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'date'
  | 'select'
  | 'boolean'
  | 'json' // nested object/array values rendered as a read-only formatted block

export interface FieldOption {
  value: string
  label: string
}

export interface ActionField {
  /** API payload key, e.g. 'monthlyAmount'. */
  key: string
  /** User-facing label, e.g. 'Monthly Revenue'. */
  label: string
  type: FieldType
  /** Existing value before the change (updates only); omitted for creates. */
  currentValue?: unknown
  /** Proposed new value (or the value to write for creates). The user may edit this in the preview.
   * Widened to `unknown` so `json`-typed fields can carry nested objects/arrays directly. */
  newValue: unknown
  /** Options for selects. */
  options?: FieldOption[]
  /** Small hint shown under the field. */
  helper?: string
  /**
   * For chained creates only: a sentinel value like `"$ref:action_1"` means
   * "substitute the id returned by the action with that refId, at apply time."
   * The executor resolves this just before calling the API.
   */
}

export interface ProposedAction {
  /** Unique id within this proposal — used as a reference target for chained actions. */
  id: string
  kind: ActionKind
  entity: ActionEntity
  /** For updates: the id of the record being changed. */
  targetId?: string
  /** User-facing description, e.g. 'Horseshoe Bay service agreement' or 'New client: Hill Country Properties'. */
  targetLabel: string
  /** Editable fields shown in the preview and sent in the API payload. */
  fields: ActionField[]
}

export interface ProposedActionSet {
  /** Short one-line summary of the whole chain. */
  summary: string
  actions: ProposedAction[]
  /** Optional derived insight to render in the preview, e.g. 'Profit $2,900/mo · margin 44.6%'. */
  derived?: string
}

export interface ClarifyChoice {
  id: string
  label: string
  hint?: string
}

export interface ProposedClarification {
  question: string
  /** Optional inline buttons for disambiguation. */
  choices?: ClarifyChoice[]
}

/**
 * What the chat route returns for an action turn. Question turns return plain
 * text via the existing flow — they do not produce this type.
 */
export type ActionTurnResponse =
  | { kind: 'actions'; data: ProposedActionSet }
  | { kind: 'clarify'; data: ProposedClarification }

export type ActionApplyStatus =
  | 'pending'
  | 'in_progress'
  | 'success'
  | 'failure'
  | 'skipped'

export interface ActionApplyResult {
  /** Matches ProposedAction.id. */
  actionId: string
  status: ActionApplyStatus
  /** Resulting record id on success (used by downstream chained actions). */
  recordId?: string
  /** Human-readable message on failure. */
  error?: string
}

/** Sentinel marker for chained-create references in field values. */
export const ACTION_REF_PREFIX = '$ref:'

export function isActionRef(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(ACTION_REF_PREFIX)
}

export function refToActionId(value: string): string {
  return value.slice(ACTION_REF_PREFIX.length)
}
