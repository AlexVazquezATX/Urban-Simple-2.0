// Audit-trail endpoint for AI-driven actions. Called by the chat's preview
// card after a chain finishes; writes one AuditLog row per successful action
// so the natural-language prompt + the effective change are visible in the
// per-record changelog UI alongside hand-made edits.
//
// Fire-and-forget on the client. Errors are logged server-side but never
// surfaced — failing to audit must not undo a successful change.

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

interface LoggedField {
  key: string
  value: unknown
}

interface LoggedAction {
  id: string
  kind: 'create' | 'update'
  entity: string
  targetId?: string | null
  targetLabel?: string
  fields: LoggedField[]
}

interface LoggedResult {
  actionId: string
  status: 'pending' | 'in_progress' | 'success' | 'failure' | 'skipped'
  recordId?: string
  error?: string
}

interface LogBody {
  prompt: string
  actions: LoggedAction[]
  results: LoggedResult[]
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as Partial<LogBody>
  const prompt = typeof body.prompt === 'string' ? body.prompt : ''
  const actions: LoggedAction[] = Array.isArray(body.actions) ? body.actions : []
  const results: LoggedResult[] = Array.isArray(body.results) ? body.results : []

  // One audit row per successfully applied action.
  let logged = 0
  for (const result of results) {
    if (result.status !== 'success' || !result.recordId) continue
    const action = actions.find((a) => a.id === result.actionId)
    if (!action) continue
    if (action.kind !== 'create' && action.kind !== 'update') continue

    await logAudit({
      userId: user.id,
      action: action.kind,
      entityType: action.entity,
      entityId: result.recordId,
      newValues: {
        via: 'ai_assistant',
        prompt,
        targetLabel: action.targetLabel ?? null,
        fields: action.fields,
      },
    })
    logged += 1
  }

  return NextResponse.json({ success: true, logged })
}
