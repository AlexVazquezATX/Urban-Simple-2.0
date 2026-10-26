import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/db'
import { getPortalContext } from '@/lib/portal-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { onIssueComment } from '@/lib/ops/issue-events'

const MAX_COMMENT = 4000

// POST /api/portal/issues/[id]/comments — client reply on an issue/request.
// Replying with { reopen: true } on a resolved issue sets it back to open
// ("This isn't fixed").
//
// Body: { comment: string, reopen?: boolean }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // A super admin previewing the portal must not post as staff into a real
  // client's thread (it would email the client).
  if (ctx.impersonating) {
    return NextResponse.json({ error: 'Replies are disabled while viewing as a client' }, { status: 403 })
  }

  const limit = checkRateLimit(`portal-comment:${ctx.userId}`, { limit: 30, windowSeconds: 10 * 60 })
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many replies in a short time. Please try again in a bit.' }, { status: 429 })
  }

  const { id } = await params
  const issue = await prisma.issue.findFirst({
    where: { id, clientId: ctx.client.id, visibleToClient: true },
    select: { id: true, status: true },
  })
  if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const comment = typeof body.comment === 'string' ? body.comment.trim() : ''
  if (!comment) return NextResponse.json({ error: 'Write a reply first' }, { status: 400 })
  if (comment.length > MAX_COMMENT) {
    return NextResponse.json({ error: `Please keep replies under ${MAX_COMMENT} characters` }, { status: 400 })
  }

  const isDone = issue.status === 'resolved' || issue.status === 'closed'
  const reopen = body.reopen === true && isDone

  const created = await prisma.$transaction(async tx => {
    const c = await tx.issueComment.create({
      data: { issueId: issue.id, userId: ctx.userId, comment, isInternal: false },
      select: { id: true, createdAt: true },
    })
    if (reopen) {
      await tx.issue.update({
        where: { id: issue.id },
        data: { status: 'open', resolvedAt: null },
      })
    }
    return c
  })

  after(() => onIssueComment({ issueId: issue.id, commentId: created.id }))

  return NextResponse.json({ id: created.id, reopened: reopen }, { status: 201 })
}
