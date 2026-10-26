// Single-issue staff endpoints. GET / PATCH / DELETE, all scoped to the user's
// company via the issue→client→companyId chain. PATCH is managers and up
// (status, resolution, assignee, severity, category, client visibility);
// DELETE is admins only and hard-deletes (IssueComment cascades).

import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ISSUE_CATEGORIES, ISSUE_STATUSES, REQUEST_KINDS, SEVERITIES } from '@/lib/ops/constants'
import { onIssueStatusChanged } from '@/lib/ops/issue-events'
import { clientSafeText, isAdminRole, isManagerRole } from '@/lib/ops/client-copy'

const ISSUE_CATEGORY_SET = new Set<string>(ISSUE_CATEGORIES.map(c => c.id))
const REQUEST_KIND_SET = new Set<string>(REQUEST_KINDS.map(c => c.id))
const SEVERITY_SET = new Set<string>(SEVERITIES)
const STATUS_SET = new Set<string>(ISSUE_STATUSES)

// Issue management is a staff surface. Clients read their own issues through
// the portal, never here (it exposes internal notes).
const STAFF_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE'])

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!STAFF_ROLES.has(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const issue = await prisma.issue.findFirst({
    where: {
      id,
      client: { companyId: user.companyId },
      ...(user.role === 'ASSOCIATE' && { reportedById: user.id }),
    },
    include: {
      location: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      serviceLog: {
        select: {
          id: true,
          serviceDate: true,
          incompleteItems: true,
          associate: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      comments: {
        // Associates don't see manager-only discussion on their own report.
        ...(user.role === 'ASSOCIATE' && { where: { OR: [{ isInternal: false }, { userId: user.id }] } }),
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
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
  if (!isManagerRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.issue.findFirst({
    where: { id, client: { companyId: user.companyId } },
    include: { location: { select: { name: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim().slice(0, 200)
  if (body.description !== undefined) {
    data.description = typeof body.description === 'string' && body.description.trim() ? body.description : null
  }

  if (body.category !== undefined) {
    const allowed = existing.type === 'request' ? REQUEST_KIND_SET : ISSUE_CATEGORY_SET
    // Legacy rows may hold a category outside the current list; keeping it is fine.
    if (typeof body.category !== 'string' || (!allowed.has(body.category) && body.category !== existing.category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    data.category = body.category
  }

  if (body.severity !== undefined) {
    if (typeof body.severity !== 'string' || !SEVERITY_SET.has(body.severity)) {
      return NextResponse.json({ error: 'Invalid severity' }, { status: 400 })
    }
    data.severity = body.severity
  }

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !STATUS_SET.has(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    data.status = body.status
    // Stamp resolvedAt when moving to a terminal state; clear it on reopen.
    if (body.status === 'resolved' || body.status === 'closed') {
      data.resolvedAt = existing.resolvedAt ?? new Date()
    } else {
      data.resolvedAt = null
    }
  }

  // The resolution goes to the client in the "resolved" email.
  if (body.resolution !== undefined) {
    data.resolution =
      typeof body.resolution === 'string' && body.resolution.trim() ? clientSafeText(body.resolution) : null
  }

  if (body.visibleToClient !== undefined) {
    if (typeof body.visibleToClient !== 'boolean') {
      return NextResponse.json({ error: 'visibleToClient must be true or false' }, { status: 400 })
    }
    data.visibleToClient = body.visibleToClient
  }

  let newAssigneeId: string | null = null
  if (body.assignedToId !== undefined) {
    if (body.assignedToId === null || body.assignedToId === '') {
      data.assignedToId = null
    } else {
      if (typeof body.assignedToId !== 'string') {
        return NextResponse.json({ error: 'Invalid assignee' }, { status: 400 })
      }
      const assignee = await prisma.user.findFirst({
        where: {
          id: body.assignedToId,
          companyId: user.companyId,
          isActive: true,
          role: { in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE'] },
        },
        select: { id: true },
      })
      if (!assignee) {
        return NextResponse.json({ error: 'Assignee must be an active team member' }, { status: 400 })
      }
      data.assignedToId = assignee.id
      if (assignee.id !== existing.assignedToId) newAssigneeId = assignee.id
    }
  }

  if (Array.isArray(body.photos)) {
    data.photos = body.photos.filter((p: unknown) => typeof p === 'string').slice(0, 20)
  }

  const updated = await prisma.issue.update({ where: { id }, data })

  if (newAssigneeId && newAssigneeId !== user.id) {
    try {
      await prisma.notification.create({
        data: {
          userId: newAssigneeId,
          type: 'action_required',
          title: `Assigned to you: ${updated.title}`.slice(0, 200),
          message: `${existing.location.name} · assigned by ${user.firstName} ${user.lastName}`.trim(),
          link: `/operations/issues/${id}`,
        },
      })
    } catch (err) {
      console.error('[issues] assignee notification failed:', err)
    }
  }

  if (updated.status !== existing.status) {
    const previousStatus = existing.status
    after(() => onIssueStatusChanged({ issueId: id, previousStatus, actorId: user.id }))
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminRole(user.role)) {
    return NextResponse.json({ error: 'Only an admin can delete an issue' }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.issue.findFirst({
    where: { id, client: { companyId: user.companyId } },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.issue.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
