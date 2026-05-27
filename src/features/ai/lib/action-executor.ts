// Client-side runner for a ProposedActionSet. Walks the chain in order, calls
// the existing CRUD endpoints, substitutes $ref:... references with resulting
// record ids from earlier creates, and halts on the first failure (marking the
// rest as skipped). Returns one ActionApplyResult per action.
//
// The executor deliberately uses the SAME endpoints the forms use, so auth,
// validation, and per-record audit (where the endpoints log it today) all
// happen exactly as they would for a manual edit.

import {
  ACTION_REF_PREFIX,
  type ActionApplyResult,
  type ActionEntity,
  type ActionField,
  type ActionKind,
  type ProposedAction,
  type ProposedActionSet,
} from '../types/action-types'

interface ApplyOptions {
  /** Called with the running results array after each action's status changes. */
  onProgress?: (results: ActionApplyResult[]) => void
}

export async function executeActionChain(
  set: ProposedActionSet,
  options?: ApplyOptions
): Promise<ActionApplyResult[]> {
  const results: ActionApplyResult[] = set.actions.map((a) => ({
    actionId: a.id,
    status: 'pending',
  }))

  for (let i = 0; i < set.actions.length; i++) {
    const action = set.actions[i]
    results[i] = { ...results[i], status: 'in_progress' }
    options?.onProgress?.([...results])

    try {
      const resolvedFields = resolveRefs(action, results)
      const payload = buildPayload(action.entity, resolvedFields)
      const { recordId } = await callEndpoint(
        action.entity,
        action.kind,
        action.targetId,
        payload
      )
      results[i] = { actionId: action.id, status: 'success', recordId }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      results[i] = { actionId: action.id, status: 'failure', error: message }
      // Halt the chain — remaining actions are skipped.
      for (let j = i + 1; j < set.actions.length; j++) {
        results[j] = { actionId: set.actions[j].id, status: 'skipped' }
      }
      options?.onProgress?.([...results])
      return results
    }
    options?.onProgress?.([...results])
  }

  return results
}

/**
 * Replace any "$ref:<actionId>" sentinels in the action's field values with
 * the resulting record id from the referenced action. Throws if the reference
 * hasn't been resolved (which means a misordered chain — should not happen
 * because we execute in order).
 */
function resolveRefs(
  action: ProposedAction,
  prior: ActionApplyResult[]
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}
  for (const field of action.fields) {
    resolved[field.key] = resolveFieldValue(field, prior)
  }
  return resolved
}

function resolveFieldValue(
  field: ActionField,
  prior: ActionApplyResult[]
): unknown {
  const value = field.newValue
  if (typeof value === 'string' && value.startsWith(ACTION_REF_PREFIX)) {
    const refId = value.slice(ACTION_REF_PREFIX.length)
    const ref = prior.find((r) => r.actionId === refId)
    if (!ref || ref.status !== 'success' || !ref.recordId) {
      throw new Error(
        `Reference '${value}' has not resolved yet (action '${refId}' not successful)`
      )
    }
    return ref.recordId
  }
  return value
}

/**
 * Per-entity payload assembly. The only special-case today is that the
 * locations endpoint takes a nested `address` object instead of flat
 * street/city/state/zip fields.
 */
function buildPayload(
  entity: ActionEntity,
  fields: Record<string, unknown>
): Record<string, unknown> {
  if (entity === 'location') {
    const { street, city, state, zip, ...rest } = fields as Record<string, unknown>
    const hasAddress =
      street !== undefined || city !== undefined || state !== undefined || zip !== undefined
    if (hasAddress) {
      rest.address = {
        street: street ?? '',
        city: city ?? '',
        state: state ?? '',
        zip: zip ?? '',
      }
    }
    return rest
  }
  return fields
}

/**
 * Call the appropriate existing CRUD endpoint. Throws Error with a useful
 * message on non-2xx. Returns the new/updated record's id.
 */
async function callEndpoint(
  entity: ActionEntity,
  kind: ActionKind,
  targetId: string | undefined,
  payload: Record<string, unknown>
): Promise<{ recordId: string }> {
  let url: string
  let method: 'POST' | 'PATCH'

  switch (entity) {
    case 'client':
      if (kind === 'create') {
        url = '/api/clients'
        method = 'POST'
      } else {
        if (!targetId) throw new Error('targetId required to update client')
        url = `/api/clients/${targetId}`
        method = 'PATCH'
      }
      break

    case 'location':
      if (kind === 'create') {
        const clientId = payload.clientId
        if (typeof clientId !== 'string' || !clientId) {
          throw new Error('clientId required to create a location')
        }
        url = `/api/clients/${clientId}/locations`
        method = 'POST'
        // The path already carries clientId; strip it from the body.
        delete payload.clientId
      } else {
        if (!targetId) throw new Error('targetId required to update location')
        url = `/api/locations/${targetId}`
        method = 'PATCH'
      }
      break

    case 'service_agreement':
      if (kind === 'create') {
        url = '/api/service-agreements'
        method = 'POST'
      } else {
        if (!targetId) throw new Error('targetId required to update service agreement')
        url = `/api/service-agreements/${targetId}`
        method = 'PATCH'
      }
      break

    case 'recurring_expense':
      if (kind === 'create') {
        url = '/api/financials/expenses'
        method = 'POST'
      } else {
        if (!targetId) throw new Error('targetId required to update recurring expense')
        url = `/api/financials/expenses/${targetId}`
        method = 'PATCH'
      }
      break

    default:
      throw new Error(`Unknown entity: ${entity satisfies never}`)
  }

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    const message =
      (errBody && typeof errBody === 'object' && 'error' in errBody && String(errBody.error)) ||
      `${method} ${url} failed (${res.status})`
    throw new Error(message)
  }

  const data = await res.json().catch(() => null)
  const recordId =
    (data && typeof data === 'object' && 'id' in data && typeof data.id === 'string' && data.id) ||
    null
  if (!recordId) {
    throw new Error(`No record id returned from ${method} ${url}`)
  }
  return { recordId }
}
