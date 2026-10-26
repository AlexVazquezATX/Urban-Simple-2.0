// POST /api/issues/[id]/notify-client { message? }: share an issue with the
// client and alert their opted-in contacts for that location now. Marks the
// issue visible in the portal either way. Managers and up.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { clientRecipientsForLocation, smsConfigured } from '@/lib/notify'
import { sendIssueToClient } from '@/lib/ops/issue-events'
import { clientSafeText, isManagerRole } from '@/lib/ops/client-copy'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isManagerRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const issue = await prisma.issue.findFirst({
    where: { id, client: { companyId: user.companyId } },
    select: {
      id: true,
      clientId: true,
      locationId: true,
      reportedBy: { select: { role: true, email: true } },
    },
  })
  if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const message =
    typeof body.message === 'string' && body.message.trim()
      ? clientSafeText(body.message).slice(0, 2000)
      : null

  const recipients = await clientRecipientsForLocation({
    clientId: issue.clientId,
    locationId: issue.locationId,
  })
  const reporterIsClient = issue.reportedBy.role === 'CLIENT_USER' && !!issue.reportedBy.email
  const reachable = recipients.filter(r => r.email || (r.phone && smsConfigured())).length

  try {
    const result = await sendIssueToClient({ issueId: issue.id, message })
    const sent = result.emailed + result.texted

    let note: string
    if (reachable === 0 && !reporterIsClient) {
      note =
        'No client contacts are set up for alerts at this location. It is now visible in their portal. Turn on alerts on the client\'s contacts to email or text them.'
    } else if (sent === 0) {
      note = 'Shared in the portal, but no alert could be delivered. Check the contact details and try again.'
    } else {
      const parts = []
      if (result.emailed) parts.push(`${result.emailed} email${result.emailed === 1 ? '' : 's'}`)
      if (result.texted) parts.push(`${result.texted} text${result.texted === 1 ? '' : 's'}`)
      note = `Sent ${parts.join(' and ')}.`
    }

    return NextResponse.json({
      emailed: result.emailed,
      texted: result.texted,
      recipients: reachable,
      message: note,
    })
  } catch (err) {
    console.error('[issues/notify-client] failed:', err)
    return NextResponse.json({ error: 'Failed to send to client' }, { status: 500 })
  }
}
