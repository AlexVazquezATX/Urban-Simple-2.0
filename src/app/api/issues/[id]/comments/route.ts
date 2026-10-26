// POST /api/issues/[id]/comments: add to an issue's thread.
// Managers and up may comment on any issue; an associate only on an issue they
// reported, and their comments are always internal (associates don't message
// clients directly). Public staff comments on client-visible issues are
// emailed to the client by onIssueComment.

import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { onIssueComment } from '@/lib/ops/issue-events'
import { clientSafeText, isManagerRole } from '@/lib/ops/client-copy'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isManager = isManagerRole(user.role)
  if (!isManager && user.role !== 'ASSOCIATE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const issue = await prisma.issue.findFirst({
    where: { id, client: { companyId: user.companyId } },
    select: { id: true, reportedById: true },
  })
  if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isManager && issue.reportedById !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const raw = typeof body.comment === 'string' ? body.comment.trim() : ''
  if (!raw) return NextResponse.json({ error: 'comment is required' }, { status: 400 })
  if (raw.length > 5000) return NextResponse.json({ error: 'Comment is too long' }, { status: 400 })

  const isInternal = !isManager || body.isInternal === true
  const comment = await prisma.issueComment.create({
    data: {
      issueId: issue.id,
      userId: user.id,
      comment: isInternal ? raw : clientSafeText(raw),
      isInternal,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  })

  after(() => onIssueComment({ issueId: issue.id, commentId: comment.id }))

  return NextResponse.json(comment, { status: 201 })
}
