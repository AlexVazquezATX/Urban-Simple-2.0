import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { smsConfigured } from '@/lib/notify'
import { toE164 } from '@/lib/notify/sms'
import type { IncompleteItem } from '@/lib/ops/constants'
import { isAdminRole, isManagerRole } from '@/lib/ops/client-copy'
import { IssueDetail, type IssueDetailData } from '@/components/issues/issue-detail'

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE']

function parseIncompleteItems(raw: unknown): IncompleteItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x, i) => ({
      itemId: typeof x.itemId === 'string' ? x.itemId : `item-${i}`,
      text: typeof x.text === 'string' ? x.text : '',
      section: typeof x.section === 'string' ? x.section : undefined,
      reason: typeof x.reason === 'string' ? x.reason : 'other',
      note: typeof x.note === 'string' ? x.note : undefined,
      photos: Array.isArray(x.photos) ? x.photos.filter((p): p is string => typeof p === 'string') : [],
    }))
    .filter(x => x.text)
}

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
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!issue) {
    notFound()
  }

  const canManage = isManagerRole(user.role)

  // Assignee picker (active humans with a login) and the client contacts who
  // get alerts for this location (empty locationIds = every location).
  const [staff, contacts] = await Promise.all([
    canManage
      ? prisma.user.findMany({
          where: {
            companyId: user.companyId,
            isActive: true,
            authId: { not: null },
            // Associates can't open /operations, so they aren't assignable.
            role: { in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
          },
          select: { id: true, firstName: true, lastName: true, role: true },
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        })
      : Promise.resolve([]),
    prisma.clientContact.findMany({
      where: { clientId: issue.clientId, OR: [{ alertEmail: true }, { alertSms: true }] },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        locationIds: true,
        alertEmail: true,
        alertSms: true,
        smsOptedOutAt: true,
      },
      orderBy: [{ firstName: 'asc' }],
    }),
  ])

  const textingEnabled = smsConfigured()
  const recipients = contacts
    .filter(c => c.locationIds.length === 0 || c.locationIds.includes(issue.locationId))
    .map(c => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`.trim(),
      email: c.alertEmail && c.email ? c.email : null,
      phone: c.alertSms && !c.smsOptedOutAt ? toE164(c.phone) : null,
      smsOptedOut: !!c.smsOptedOutAt,
      allLocations: c.locationIds.length === 0,
    }))

  // Serialize dates for the client component boundary.
  const data: IssueDetailData = {
    id: issue.id,
    type: issue.type,
    source: issue.source,
    title: issue.title,
    description: issue.description,
    category: issue.category,
    severity: issue.severity,
    status: issue.status,
    photos: issue.photos,
    resolution: issue.resolution,
    resolvedAt: issue.resolvedAt ? issue.resolvedAt.toISOString() : null,
    visibleToClient: issue.visibleToClient,
    clientNotifiedAt: issue.clientNotifiedAt ? issue.clientNotifiedAt.toISOString() : null,
    preferredDate: issue.preferredDate ? issue.preferredDate.toISOString() : null,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    location: issue.location,
    client: issue.client,
    reportedBy: issue.reportedBy,
    assignedTo: issue.assignedTo,
    serviceLog: issue.serviceLog
      ? {
          id: issue.serviceLog.id,
          serviceDate: issue.serviceLog.serviceDate.toISOString(),
          associate: issue.serviceLog.associate,
          incompleteItems: parseIncompleteItems(issue.serviceLog.incompleteItems),
        }
      : null,
    comments: issue.comments.map((comment) => ({
      id: comment.id,
      comment: comment.comment,
      isInternal: comment.isInternal,
      createdAt: comment.createdAt.toISOString(),
      user: comment.user,
    })),
  }

  return (
    <IssueDetail
      issue={data}
      staff={staff}
      recipients={recipients}
      textingEnabled={textingEnabled}
      canManage={canManage}
      canDelete={isAdminRole(user.role)}
    />
  )
}
