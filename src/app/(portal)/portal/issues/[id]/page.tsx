import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await requirePortalContext()

  const issue = await prisma.issue.findFirst({
    where: { id, clientId: ctx.client.id },
    include: {
      location: { select: { id: true, name: true } },
      reportedBy: { select: { firstName: true, lastName: true } },
      assignedTo: { select: { firstName: true, lastName: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { firstName: true, lastName: true, role: true } } },
      },
    },
  })

  if (!issue) notFound()

  const statusIcon =
    issue.status === 'resolved' || issue.status === 'closed' ? (
      <CheckCircle2 className="h-4 w-4 text-lime-600" />
    ) : issue.status === 'in_progress' ? (
      <Clock className="h-4 w-4 text-amber-600" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-600" />
    )

  return (
    <div className="space-y-4">
      <Link
        href="/portal/issues"
        className="inline-flex items-center gap-1 text-xs text-warm-500 hover:text-ocean-600"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to issues
      </Link>

      <div className="rounded-sm border border-warm-200 bg-white p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{statusIcon}</div>
          <div className="flex-1">
            <h1 className="text-lg font-medium text-warm-900">{issue.title}</h1>
            <p className="mt-1 text-xs text-warm-500">
              {issue.location.name} • Reported {format(issue.createdAt, 'EEE, MMM d, yyyy')} by {issue.reportedBy.firstName}
            </p>
          </div>
          <Badge
            className={`shrink-0 rounded-sm text-[10px] px-1.5 py-0 ${
              issue.severity === 'critical'
                ? 'bg-red-100 text-red-700 border-red-200'
                : issue.severity === 'high'
                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                  : 'bg-warm-100 text-warm-600 border-warm-200'
            }`}
          >
            {issue.severity}
          </Badge>
        </div>

        {issue.description && (
          <p className="text-sm text-warm-700 whitespace-pre-wrap">{issue.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-warm-500">
          <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 text-warm-600">
            {issue.category}
          </Badge>
          <span>·</span>
          <span>Status: <strong className="text-warm-700">{issue.status.replace('_', ' ')}</strong></span>
          {issue.assignedTo && (
            <>
              <span>·</span>
              <span>Assigned to {issue.assignedTo.firstName} {issue.assignedTo.lastName}</span>
            </>
          )}
        </div>

        {issue.resolvedAt && issue.resolution && (
          <div className="rounded-sm border border-lime-200 bg-lime-50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-lime-700">Resolved {format(issue.resolvedAt, 'MMM d')}</p>
            <p className="mt-1 text-sm text-warm-700 whitespace-pre-wrap">{issue.resolution}</p>
          </div>
        )}

        {issue.photos.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {issue.photos.map((url, idx) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={idx}
                src={url}
                alt=""
                className="h-24 w-full rounded-sm object-cover"
              />
            ))}
          </div>
        )}
      </div>

      {issue.comments.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-warm-500">Activity</p>
          {issue.comments.map((c) => {
            const isUrbanSimple = c.user.role !== 'CLIENT_USER'
            return (
              <div
                key={c.id}
                className={`rounded-sm border p-3 ${
                  isUrbanSimple
                    ? 'border-ocean-200 bg-ocean-50/40'
                    : 'border-warm-200 bg-white'
                }`}
              >
                <p className="text-[11px] text-warm-500">
                  <strong className="text-warm-700">
                    {isUrbanSimple ? 'Urban Simple' : `${c.user.firstName} ${c.user.lastName}`}
                  </strong>
                  {' • '}
                  {format(c.createdAt, 'MMM d, h:mm a')}
                </p>
                <p className="mt-1 text-sm text-warm-700 whitespace-pre-wrap">{c.comment}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
