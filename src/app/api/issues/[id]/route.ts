// Single-issue admin endpoints. GET / PATCH / DELETE, all scoped to the user's
// company via the issue→client→companyId chain. PATCH supports partial updates
// of any user-editable field (notably status + resolution for resolving).
// DELETE is hard delete — the IssueComment relation cascades on delete.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

const CATEGORIES = new Set(['quality', 'equipment', 'communication', 'safety', 'other'])
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical'])
const STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed'])

async function ownedBy(id: string, companyId: string) {
  return prisma.issue.findFirst({
    where: { id, client: { companyId } },
  })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const issue = await prisma.issue.findFirst({
    where: { id, client: { companyId: user.companyId } },
    include: {
      location: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, firstName: true, lastName: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      comments: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(issue)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await ownedBy(id, user.companyId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (typeof body.title === 'string') data.title = body.title.trim()
  if (body.description !== undefined)
    data.description = typeof body.description === 'string' ? body.description : null
  if (typeof body.category === 'string' && CATEGORIES.has(body.category))
    data.category = body.category
  if (typeof body.severity === 'string' && SEVERITIES.has(body.severity))
    data.severity = body.severity
  if (typeof body.status === 'string' && STATUSES.has(body.status)) {
    data.status = body.status
    // Auto-stamp resolvedAt when moving to a terminal state. Reset when
    // re-opening to keep the field honest.
    if (body.status === 'resolved' || body.status === 'closed') {
      data.resolvedAt = existing.resolvedAt ?? new Date()
    } else if (body.status === 'open' || body.status === 'in_progress') {
      data.resolvedAt = null
    }
  }
  if (body.resolution !== undefined)
    data.resolution = typeof body.resolution === 'string' ? body.resolution : null
  if (body.assignedToId !== undefined)
    data.assignedToId =
      typeof body.assignedToId === 'string' ? body.assignedToId : null
  if (Array.isArray(body.photos))
    data.photos = body.photos.filter((p: unknown) => typeof p === 'string')

  const updated = await prisma.issue.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await ownedBy(id, user.companyId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.issue.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
