import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { draftReply } from '@/lib/comms/classify'

/**
 * POST /api/communications/[id]/draft — AI-draft a reply to an inbound
 * message, for human review in the composer (nothing is sent or stored).
 * Follows the house outreach rules (no em dashes, no placeholders, no
 * invented facts, walkthrough/email CTAs only, signs as Alex).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const original = await prisma.commMessage.findFirst({
      where: { id, companyId: user.companyId },
    })
    if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (original.direction !== 'inbound') {
      return NextResponse.json({ error: 'Can only draft a reply to an inbound message' }, { status: 400 })
    }

    // Context: prospect name + our last outbound in the same thread.
    const [prospect, contact, lastOutbound] = await Promise.all([
      original.prospectId
        ? prisma.prospect.findUnique({ where: { id: original.prospectId }, select: { companyName: true } })
        : null,
      original.fromEmail
        ? prisma.prospectContact.findFirst({
            where: { email: { equals: original.fromEmail, mode: 'insensitive' } },
            select: { firstName: true, lastName: true },
          })
        : null,
      original.threadKey
        ? prisma.commMessage.findFirst({
            where: { companyId: user.companyId, threadKey: original.threadKey, direction: 'outbound' },
            orderBy: { createdAt: 'desc' },
            select: { body: true },
          })
        : null,
    ])

    const draft = await draftReply({
      inboundSubject: original.subject,
      inboundBody: original.body,
      companyName: prospect?.companyName ?? null,
      counterpartName: contact ? `${contact.firstName} ${contact.lastName}`.trim() || null : null,
      threadContext: lastOutbound?.body ?? null,
    })
    if (!draft) return NextResponse.json({ error: 'Draft generation failed' }, { status: 502 })

    return NextResponse.json({ draft })
  } catch (error) {
    console.error('Error drafting reply:', error)
    return NextResponse.json({ error: 'Failed to draft reply' }, { status: 500 })
  }
}
