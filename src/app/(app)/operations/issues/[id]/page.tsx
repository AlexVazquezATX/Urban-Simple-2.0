import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { IssueDetail, type IssueDetailData } from '@/components/issues/issue-detail'

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE']

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  if (!STAFF_ROLES.includes(user.role)) {
    return <div>Access denied</div>
  }

  const { id } = await params

  // Scope to the user's company via the issue → client → companyId chain,
  // mirroring the API endpoints.
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

  if (!issue) {
    notFound()
  }

  // Serialize dates for the client component boundary.
  const data: IssueDetailData = {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    category: issue.category,
    severity: issue.severity,
    status: issue.status,
    photos: issue.photos,
    resolution: issue.resolution,
    resolvedAt: issue.resolvedAt ? issue.resolvedAt.toISOString() : null,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    location: issue.location,
    client: issue.client,
    reportedBy: issue.reportedBy,
    assignedTo: issue.assignedTo,
    comments: issue.comments.map((comment) => ({
      id: comment.id,
      comment: comment.comment,
      isInternal: comment.isInternal,
      createdAt: comment.createdAt.toISOString(),
      user: comment.user,
    })),
  }

  return <IssueDetail issue={data} />
}
