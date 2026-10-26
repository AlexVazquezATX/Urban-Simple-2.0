import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { categoryLabel, reasonLabel, type IncompleteItem } from '@/lib/ops/constants'
import { clientTimezone, formatLocalDateTime } from '@/lib/portal-dates'
import { LivePage } from '@/components/portal/live-shell'
import { StatusChip, UnfinishedBadge } from '@/components/portal/issue-chips'
import { IssueReplyForm } from '@/components/portal/issue-reply-form'

// Issue detail — LiveIssues card language: display title + pastel status
// chip, meta line, body, photo thumbs, and reply panels (gold-tinted avatar
// circle + name + time) for the comment thread. Type-aware: client reports,
// crew-flagged unfinished work (items from the visit's service log) and
// service requests all render here.

function parseIncompleteItems(raw: unknown): IncompleteItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
    .map(i => ({
      itemId: String(i.itemId ?? ''),
      text: typeof i.text === 'string' ? i.text : '',
      section: typeof i.section === 'string' ? i.section : undefined,
      reason: typeof i.reason === 'string' ? i.reason : '',
      note: typeof i.note === 'string' ? i.note : undefined,
      photos: Array.isArray(i.photos)
        ? i.photos.filter((p): p is string => typeof p === 'string' && /^https?:\/\//.test(p))
        : [],
    }))
    .filter(i => i.text)
}

function PhotoRow({ photos, size = 'md' }: { photos: string[]; size?: 'sm' | 'md' }) {
  if (photos.length === 0) return null
  const dims = size === 'sm' ? 'h-16 w-[86px]' : 'h-[76px] w-[110px]'
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {photos.map((url, idx) => (
        <a key={idx} href={url} target="_blank" rel="noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Photo ${idx + 1}`}
            className={`${dims} rounded-[10px] border border-border object-cover`}
          />
        </a>
      ))}
    </div>
  )
}

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await requirePortalContext()

  const issue = await prisma.issue.findFirst({
    where: { id, clientId: ctx.client.id, visibleToClient: true },
    include: {
      location: { select: { id: true, name: true } },
      reportedBy: { select: { firstName: true, lastName: true, role: true } },
      assignedTo: { select: { firstName: true, lastName: true } },
      serviceLog: { select: { serviceDate: true, incompleteItems: true } },
      comments: {
        where: { isInternal: false },
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { firstName: true, lastName: true, role: true } } },
      },
    },
  })

  if (!issue) notFound()
  const timezone = await clientTimezone(ctx.client.id)

  const isRequest = issue.type === 'request'
  const isUnfinished = issue.type === 'incomplete_work'
  const isDone = issue.status === 'resolved' || issue.status === 'closed'
  const items = isUnfinished ? parseIncompleteItems(issue.serviceLog?.incompleteItems) : []
  const backHref = isRequest ? '/portal/requests' : '/portal/issues'

  const reporter =
    issue.reportedBy.role === 'CLIENT_USER' ? issue.reportedBy.firstName : 'Urban Simple'
  const meta = [
    issue.location.name,
    isUnfinished
      ? `Flagged by our crew${issue.serviceLog ? ` after the ${format(issue.serviceLog.serviceDate, 'EEE, MMM d')} visit` : ''}`
      : `${isRequest ? 'Sent' : 'Reported'} ${format(issue.createdAt, 'EEE, MMM d, yyyy')} by ${reporter}`,
    isUnfinished ? null : categoryLabel(issue.category, issue.type),
    isRequest || isUnfinished ? null : `${issue.severity} priority`,
    isRequest && issue.preferredDate
      ? `Preferred date ${format(issue.preferredDate, 'EEE, MMM d')}`
      : null,
    issue.assignedTo ? `With ${issue.assignedTo.firstName} ${issue.assignedTo.lastName}` : null,
  ].filter(Boolean)

  return (
    <LivePage>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        {isRequest ? 'Back to requests' : 'Back to issues'}
      </Link>

      <div className="mt-4 rounded-[18px] border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="font-mono text-[10px] uppercase tracking-[2px] text-gold-600">
          {isRequest ? 'Request' : isUnfinished ? 'Unfinished work' : 'Issue'}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="min-w-0 flex-1 font-display text-[22px] font-bold tracking-[-0.4px] text-foreground">
            {issue.title}
          </h1>
          {isUnfinished && <UnfinishedBadge />}
          <StatusChip status={issue.status} type={issue.type} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{meta.join(' · ')}</p>

        {issue.description && (
          <p className="mt-4 whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground">
            {issue.description}
          </p>
        )}

        <PhotoRow photos={issue.photos} />

        {items.length > 0 && (
          <div className="mt-5">
            <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted-foreground">
              {items.length === 1 ? 'Item not finished' : `${items.length} items not finished`}
            </p>
            <ul className="mt-2.5 space-y-2.5">
              {items.map((item, idx) => (
                <li key={item.itemId || idx} className="rounded-[13px] bg-secondary px-4 py-3.5">
                  {item.section && (
                    <p className="font-mono text-[9.5px] uppercase tracking-[1.6px] text-muted-foreground">
                      {item.section}
                    </p>
                  )}
                  <p className="mt-0.5 text-[13.5px] font-semibold text-foreground">{item.text}</p>
                  {item.reason && (
                    <p className="mt-1 text-[12.5px] text-cream-700">
                      Reason: {reasonLabel(item.reason, 'en')}
                    </p>
                  )}
                  {item.note && (
                    <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-cream-700">
                      Crew note: {item.note}
                    </p>
                  )}
                  <PhotoRow photos={item.photos ?? []} size="sm" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {issue.resolvedAt && issue.resolution && (
          <div className="mt-4 rounded-[13px] border border-sage-line bg-sage-bg px-4 py-3.5">
            <p className="font-mono text-[9.5px] uppercase tracking-[1.8px] text-sage-deep">
              {isRequest ? 'Done' : 'Resolved'} {format(issue.resolvedAt, 'MMM d')}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-sage-deep">
              {issue.resolution}
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 space-y-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted-foreground">
          Conversation
        </p>
        {issue.comments.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            No replies yet. Your account manager will reply here, and you&apos;ll get an email when
            they do.
          </p>
        ) : (
          issue.comments.map((c) => {
            const isUrbanSimple = c.user.role !== 'CLIENT_USER'
            // Staff show as first name + last initial, next to the Urban Simple badge.
            const lastPart = isUrbanSimple
              ? c.user.lastName ? `${c.user.lastName.charAt(0)}.` : ''
              : c.user.lastName
            const authorName = `${c.user.firstName} ${lastPart}`.trim()
            return (
              <div key={c.id} className="flex gap-3 rounded-[13px] bg-secondary px-4 py-3.5">
                <div
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-[11px] font-bold ${
                    isUrbanSimple ? 'bg-gold-600/10 text-gold-600' : 'bg-card text-cream-700'
                  }`}
                >
                  {isUrbanSimple ? 'US' : c.user.firstName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-semibold text-foreground">
                    {authorName || 'Urban Simple'}
                    {isUrbanSimple && (
                      <span className="rounded-full border border-gold-600/30 bg-gold-600/10 px-2 py-px text-[10px] font-semibold text-gold-600">
                        Urban Simple
                      </span>
                    )}
                    <span className="font-normal text-muted-foreground">
                      · {formatLocalDateTime(c.createdAt, timezone)}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-cream-700">
                    {c.comment}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <IssueReplyForm issueId={issue.id} isDone={isDone} isRequest={isRequest} />
    </LivePage>
  )
}
