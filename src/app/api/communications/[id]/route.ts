import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/communications/[id] — full message + its thread (same threadKey,
 * chronological) + resolved entity names.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const message = await prisma.commMessage.findFirst({
    where: { id, companyId: user.companyId },
  })
  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const thread = message.threadKey
    ? await prisma.commMessage.findMany({
        where: { companyId: user.companyId, threadKey: message.threadKey },
        orderBy: { createdAt: 'asc' },
      })
    : [message]

  const [prospect, client] = await Promise.all([
    message.prospectId
      ? prisma.prospect.findUnique({ where: { id: message.prospectId }, select: { id: true, companyName: true, status: true } })
      : null,
    message.clientId
      ? prisma.client.findUnique({ where: { id: message.clientId }, select: { id: true, name: true } })
      : null,
  ])

  return NextResponse.json({ message, thread, prospect, client })
}

/**
 * PATCH /api/communications/[id] — triage: { triageState?, assignedToId?, snoozedUntil? }.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.triageState !== undefined) {
    if (body.triageState !== null && !['needs_reply', 'done', 'snoozed'].includes(body.triageState)) {
      return NextResponse.json({ error: `Invalid triageState`, validStates: ['needs_reply', 'done', 'snoozed'] }, { status: 400 })
    }
    data.triageState = body.triageState
  }
  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null
  if (body.snoozedUntil !== undefined) data.snoozedUntil = body.snoozedUntil ? new Date(body.snoozedUntil) : null
  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: 'No updatable fields in body', updatableFields: ['triageState', 'assignedToId', 'snoozedUntil'] },
      { status: 400 },
    )
  }

  const updated = await prisma.commMessage.updateMany({
    where: { id, companyId: user.companyId },
    data,
  })
  if (updated.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
