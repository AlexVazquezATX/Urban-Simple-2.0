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

interface EndpointPlan {
  url: string
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  /** Payload to send (may be rewritten — e.g. delete-via-PATCH replaces it). */
  body: Record<string, unknown> | undefined
  /** How to read the resulting record id from the response. */
  extractId: (data: unknown, targetId?: string) => string | null
}

/** Read `id` straight off the response (most CRUD endpoints). */
function defaultIdExtractor(data: unknown): string | null {
  if (data && typeof data === 'object' && 'id' in data && typeof (data as any).id === 'string') {
    return (data as any).id
  }
  return null
}

/** For deletes — there's nothing to reference downstream; return the target id
 *  so audit logging has something to point at. */
function targetIdExtractor(_data: unknown, targetId?: string): string | null {
  return targetId ?? null
}

/**
 * Plan the API call for a given action: which URL, which method, what body to
 * send, and how to extract the resulting record id. Centralises the per-entity
 * quirks (PUT vs PATCH inconsistencies in existing endpoints, deletes that are
 * really deactivations, outreach's nested response shape).
 */
function planEndpoint(
  entity: ActionEntity,
  kind: ActionKind,
  targetId: string | undefined,
  payload: Record<string, unknown>
): EndpointPlan {
  switch (entity) {
    case 'client': {
      if (kind === 'create') return { url: '/api/clients', method: 'POST', body: payload, extractId: defaultIdExtractor }
      if (!targetId) throw new Error('targetId required to update/delete client')
      if (kind === 'update') return { url: `/api/clients/${targetId}`, method: 'PATCH', body: payload, extractId: defaultIdExtractor }
      return { url: `/api/clients/${targetId}`, method: 'DELETE', body: undefined, extractId: targetIdExtractor }
    }

    case 'location': {
      if (kind === 'create') {
        const clientId = payload.clientId
        if (typeof clientId !== 'string' || !clientId) {
          throw new Error('clientId required to create a location')
        }
        // Strip clientId from body — it lives in the path.
        const { clientId: _unused, ...rest } = payload
        return { url: `/api/clients/${clientId}/locations`, method: 'POST', body: rest, extractId: defaultIdExtractor }
      }
      if (!targetId) throw new Error('targetId required to update/delete location')
      if (kind === 'update') return { url: `/api/locations/${targetId}`, method: 'PATCH', body: payload, extractId: defaultIdExtractor }
      return { url: `/api/locations/${targetId}`, method: 'DELETE', body: undefined, extractId: targetIdExtractor }
    }

    case 'service_agreement': {
      if (kind === 'create') return { url: '/api/service-agreements', method: 'POST', body: payload, extractId: defaultIdExtractor }
      if (!targetId) throw new Error('targetId required to update/delete service agreement')
      if (kind === 'update') return { url: `/api/service-agreements/${targetId}`, method: 'PATCH', body: payload, extractId: defaultIdExtractor }
      // No DELETE endpoint — deactivate via PATCH isActive=false.
      return { url: `/api/service-agreements/${targetId}`, method: 'PATCH', body: { isActive: false }, extractId: targetIdExtractor }
    }

    case 'recurring_expense': {
      if (kind === 'create') return { url: '/api/financials/expenses', method: 'POST', body: payload, extractId: defaultIdExtractor }
      if (!targetId) throw new Error('targetId required to update/delete recurring expense')
      if (kind === 'update') return { url: `/api/financials/expenses/${targetId}`, method: 'PATCH', body: payload, extractId: defaultIdExtractor }
      return { url: `/api/financials/expenses/${targetId}`, method: 'DELETE', body: undefined, extractId: targetIdExtractor }
    }

    case 'prospect': {
      if (kind === 'create') return { url: '/api/growth/prospects', method: 'POST', body: payload, extractId: defaultIdExtractor }
      if (!targetId) throw new Error('targetId required to update/delete prospect')
      if (kind === 'update') return { url: `/api/growth/prospects/${targetId}`, method: 'PATCH', body: payload, extractId: defaultIdExtractor }
      return { url: `/api/growth/prospects/${targetId}`, method: 'DELETE', body: undefined, extractId: targetIdExtractor }
    }

    case 'issue': {
      if (kind === 'create') return { url: '/api/issues', method: 'POST', body: payload, extractId: defaultIdExtractor }
      if (!targetId) throw new Error('targetId required to update/delete issue')
      if (kind === 'update') return { url: `/api/issues/${targetId}`, method: 'PATCH', body: payload, extractId: defaultIdExtractor }
      return { url: `/api/issues/${targetId}`, method: 'DELETE', body: undefined, extractId: targetIdExtractor }
    }

    case 'client_contact': {
      const clientId = typeof payload.clientId === 'string' ? payload.clientId : ''
      if (!clientId) throw new Error('clientId required for client_contact action')
      const { clientId: _unused, ...rest } = payload
      if (kind === 'create') {
        return { url: `/api/clients/${clientId}/contacts`, method: 'POST', body: rest, extractId: defaultIdExtractor }
      }
      if (!targetId) throw new Error('targetId required to update/delete client_contact')
      if (kind === 'update') {
        return { url: `/api/clients/${clientId}/contacts/${targetId}`, method: 'PATCH', body: rest, extractId: defaultIdExtractor }
      }
      return { url: `/api/clients/${clientId}/contacts/${targetId}`, method: 'DELETE', body: undefined, extractId: targetIdExtractor }
    }

    case 'location_assignment': {
      if (kind === 'create') return { url: '/api/location-assignments', method: 'POST', body: payload, extractId: defaultIdExtractor }
      if (!targetId) throw new Error('targetId required to update/delete location_assignment')
      // Existing endpoint uses PUT for updates (not PATCH).
      if (kind === 'update') return { url: `/api/location-assignments/${targetId}`, method: 'PUT', body: payload, extractId: defaultIdExtractor }
      return { url: `/api/location-assignments/${targetId}`, method: 'DELETE', body: undefined, extractId: targetIdExtractor }
    }

    case 'checklist_template': {
      if (kind === 'create') return { url: '/api/checklists', method: 'POST', body: payload, extractId: defaultIdExtractor }
      if (!targetId) throw new Error('targetId required to update/delete checklist_template')
      // Existing endpoint uses PUT; DELETE is smart (soft if in use, else hard).
      if (kind === 'update') return { url: `/api/checklists/${targetId}`, method: 'PUT', body: payload, extractId: defaultIdExtractor }
      return { url: `/api/checklists/${targetId}`, method: 'DELETE', body: undefined, extractId: targetIdExtractor }
    }

    case 'invoice': {
      if (kind === 'create') return { url: '/api/invoices', method: 'POST', body: payload, extractId: defaultIdExtractor }
      if (!targetId) throw new Error('targetId required to update/delete invoice')
      if (kind === 'update') return { url: `/api/invoices/${targetId}`, method: 'PATCH', body: payload, extractId: defaultIdExtractor }
      // No DELETE — void via PATCH status='void'.
      return { url: `/api/invoices/${targetId}`, method: 'PATCH', body: { status: 'void' }, extractId: targetIdExtractor }
    }

    case 'outreach_draft': {
      if (kind === 'create') {
        // The auto-draft endpoint accepts either:
        //  - { prospectIds: [...] } → composes a default email per prospect.
        //  - { prospectIds: [...], subjectOverride, bodyOverride, ... } →
        //    skips the composer and persists what's provided. This is the
        //    path we use when the chat route pre-composed the draft and the
        //    user (possibly) edited it in the preview card.
        const prospectId = typeof payload.prospectId === 'string' ? payload.prospectId : ''
        if (!prospectId) throw new Error('prospectId required for outreach_draft create')
        const subject = typeof payload.subject === 'string' ? payload.subject : undefined
        const body = typeof payload.body === 'string' ? payload.body : undefined
        const channel = typeof payload.channel === 'string' ? payload.channel : undefined
        const composeInstructions = typeof payload.composeInstructions === 'string' ? payload.composeInstructions : undefined
        const tone = typeof payload.tone === 'string' ? payload.tone : undefined
        const purpose = typeof payload.purpose === 'string' ? payload.purpose : undefined
        const apiBody: Record<string, unknown> = { prospectIds: [prospectId] }
        if (channel) apiBody.channelOverride = channel
        if (subject !== undefined) apiBody.subjectOverride = subject
        if (body !== undefined && body.trim().length > 0) apiBody.bodyOverride = body
        if (composeInstructions) apiBody.composeInstructions = composeInstructions
        if (tone) apiBody.tone = tone
        if (purpose) apiBody.purpose = purpose
        return {
          url: '/api/growth/outreach/auto-draft',
          method: 'POST',
          body: apiBody,
          extractId: (data) => {
            const r = (data as any)?.results?.[0]
            return typeof r?.messageId === 'string' ? r.messageId : null
          },
        }
      }
      if (!targetId) throw new Error('targetId required to update/delete outreach_draft')
      // Update / reject via PATCH on the outreach message. Reject sets
      // approvalStatus='rejected' which removes it from the active queue.
      if (kind === 'update') return { url: `/api/growth/outreach/${targetId}`, method: 'PATCH', body: payload, extractId: defaultIdExtractor }
      return { url: `/api/growth/outreach/${targetId}`, method: 'PATCH', body: { approvalStatus: 'rejected' }, extractId: targetIdExtractor }
    }

    default:
      throw new Error(`Unknown entity: ${entity satisfies never}`)
  }
}

/**
 * Call the appropriate existing CRUD endpoint via planEndpoint. Throws on
 * non-2xx with a useful message. Returns the new/updated record's id (or the
 * target id for deletes).
 */
async function callEndpoint(
  entity: ActionEntity,
  kind: ActionKind,
  targetId: string | undefined,
  payload: Record<string, unknown>
): Promise<{ recordId: string }> {
  const plan = planEndpoint(entity, kind, targetId, payload)

  const res = await fetch(plan.url, {
    method: plan.method,
    headers: { 'Content-Type': 'application/json' },
    body: plan.body === undefined ? undefined : JSON.stringify(plan.body),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    const message =
      (errBody && typeof errBody === 'object' && 'error' in errBody && String(errBody.error)) ||
      `${plan.method} ${plan.url} failed (${res.status})`
    throw new Error(message)
  }

  const data = await res.json().catch(() => null)
  const recordId = plan.extractId(data, targetId)
  if (!recordId) {
    throw new Error(`No record id returned from ${plan.method} ${plan.url}`)
  }
  return { recordId }
}
