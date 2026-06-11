import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { LivePage } from '@/components/portal/live-shell'

// Issue detail — LiveIssues card language: display title + pastel status
// chip, meta line, body, photo thumbs, and reply panels (gold-tinted avatar
// circle + name + time) for the comment thread.

const STATUS_CHIP: Record<string, { label: string; classes: string }> = {
  open: {
    label: "Open — we're on it",
    classes: 'border-peach-line bg-peach-bg text-peach-deep',
  },
  in_progress: {
    label: 'In progress',
    classes: 'border-sky-line bg-sky-bg text-sky-deep',
  },
  resolved: {
    label: 'Resolved',
    classes: 'border-sage-line bg-sage-bg text-sage-deep',
  },
  closed: {
    label: 'Resolved',
    classes: 'border-sage-line bg-sage-bg text-sage-deep',
  },
}

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

  const chip = STATUS_CHIP[issue.status] ?? STATUS_CHIP.open

  return (
    <LivePage>
      <Link
        href="/portal/issues"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to issues
      </Link>

      <div className="mt-4 rounded-[18px] border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 flex-1 font-display text-[22px] font-bold tracking-[-0.4px] text-foreground">
            {issue.title}
          </h1>
          <span
            className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-[3px] text-[11.5px] font-semibold ${chip.classes}`}
          >
            {chip.label}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {issue.location.name} · Reported {format(issue.createdAt, 'EEE, MMM d, yyyy')} by{' '}
          {issue.reportedBy.firstName} · {issue.category} · {issue.severity}
          {issue.assignedTo
            ? ` · with ${issue.assignedTo.firstName} ${issue.assignedTo.lastName}`
            : ''}
        </p>

        {issue.description && (
          <p className="mt-4 whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground">
            {issue.description}
          </p>
        )}

        {issue.photos.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {issue.photos.map((url, idx) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={idx}
                src={url}
                alt=""
                className="h-[76px] w-[110px] rounded-[10px] border border-border object-cover"
              />
            ))}
          </div>
        )}

        {issue.resolvedAt && issue.resolution && (
          <div className="mt-4 rounded-[13px] border border-sage-line bg-sage-bg px-4 py-3.5">
            <p className="font-mono text-[9.5px] uppercase tracking-[1.8px] text-sage-deep">
              Resolved {format(issue.resolvedAt, 'MMM d')}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-sage-deep">
              {issue.resolution}
            </p>
          </div>
        )}
      </div>

      {issue.comments.length > 0 && (
        <div className="mt-5 space-y-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted-foreground">
            Activity
          </p>
          {issue.comments.map((c) => {
            const isUrbanSimple = c.user.role !== 'CLIENT_USER'
            const displayName = isUrbanSimple
              ? 'Urban Simple'
              : `${c.user.firstName} ${c.user.lastName}`
            return (
              <div
                key={c.id}
                className="flex gap-3 rounded-[13px] bg-secondary px-4 py-3.5"
              >
                <div
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-[11px] font-bold ${
                    isUrbanSimple
                      ? 'bg-gold-600/10 text-gold-600'
                      : 'bg-card text-cream-700'
                  }`}
                >
                  {isUrbanSimple ? 'US' : c.user.firstName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">
                    {displayName}{' '}
                    <span className="font-normal text-muted-foreground">
                      · {format(c.createdAt, 'MMM d, h:mm a')}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-cream-700">
                    {c.comment}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </LivePage>
  )
}
