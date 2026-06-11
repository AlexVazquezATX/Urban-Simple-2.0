import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, Check } from 'lucide-react'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import type { WalkthroughZone } from '@/lib/portal-walkthrough'
import { LivePage } from '@/components/portal/live-shell'

// Walkthrough detail — LiveWalkthrough card language: display zone titles,
// sage check circles, pastel status chips, rounded photo grids.

export default async function WalkthroughDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await requirePortalContext()

  const w = await prisma.portalWalkthrough.findFirst({
    where: { id, clientId: ctx.client.id },
    include: {
      location: { select: { name: true } },
      completedBy: { select: { firstName: true, lastName: true } },
    },
  })
  if (!w) notFound()

  const zones = (Array.isArray(w.zones) ? (w.zones as unknown as WalkthroughZone[]) : []).filter(Boolean)

  return (
    <LivePage>
      <Link
        href="/portal/walkthroughs"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to walkthroughs
      </Link>

      <div className="mt-4 rounded-[18px] border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10.5px] uppercase tracking-[2.4px] text-gold-600">
              Walkthrough
            </p>
            <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.6px] text-foreground">
              {w.location.name}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">
                {format(w.capturedAt, 'EEEE, MMM d, yyyy · h:mm a')}
              </span>
              {' · '}
              {w.completedBy.firstName} {w.completedBy.lastName}
            </p>
          </div>
          {w.overallRating === 'issue' ? (
            <span className="shrink-0 rounded-full border border-peach-line bg-peach-bg px-3 py-[3px] text-[11.5px] font-semibold text-peach-deep">
              Issue flagged
            </span>
          ) : w.overallRating === 'ok' ? (
            <span className="shrink-0 rounded-full border border-sage-line bg-sage-bg px-3 py-[3px] text-[11.5px] font-semibold text-sage-deep">
              All good
            </span>
          ) : null}
        </div>

        {w.notes && (
          <div className="mt-4 rounded-xl bg-secondary px-4 py-3 text-[13.5px] leading-relaxed text-foreground">
            <span className="mb-1 block font-mono text-[9px] uppercase tracking-[1.6px] text-muted-foreground">
              Overall note
            </span>
            <span className="whitespace-pre-wrap">{w.notes}</span>
          </div>
        )}
      </div>

      <div className="mt-3.5 flex flex-col gap-3.5">
        {zones.map((z, idx) => {
          const hasIssue = z.rating === 'issue'
          const ok = z.rating === 'ok'
          return (
            <section
              key={idx}
              className="rounded-[18px] border border-border bg-card p-6 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-[1.5px] ${
                    ok
                      ? 'border-sage-line bg-sage-bg'
                      : hasIssue
                        ? 'border-peach-line bg-peach-bg'
                        : 'border-border'
                  }`}
                >
                  {ok && <Check className="h-[11px] w-[11px] text-sage-deep" strokeWidth={2.4} />}
                  {hasIssue && <span className="h-1.5 w-1.5 rounded-full bg-peach-deep" />}
                </div>
                <p className="flex-1 font-display text-base font-semibold tracking-[-0.2px] text-foreground">
                  {z.zone}
                </p>
                {hasIssue ? (
                  <span className="shrink-0 rounded-full border border-peach-line bg-peach-bg px-2.5 py-0.5 text-[11px] font-semibold text-peach-deep">
                    Issue
                  </span>
                ) : ok ? (
                  <span className="shrink-0 rounded-full border border-sage-line bg-sage-bg px-2.5 py-0.5 text-[11px] font-semibold text-sage-deep">
                    Complete
                  </span>
                ) : null}
              </div>

              {z.photos.length > 0 && (
                <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {z.photos.map((url, p) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={p}
                      src={url}
                      alt=""
                      className="h-28 w-full rounded-[14px] border border-border object-cover"
                    />
                  ))}
                </div>
              )}

              {z.notes && (
                <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-cream-700">
                  {z.notes}
                </p>
              )}

              {z.photos.length === 0 && !z.notes && (
                <p className="mt-2.5 text-[11.5px] italic text-muted-foreground">
                  No photos or notes captured.
                </p>
              )}
            </section>
          )
        })}
      </div>
    </LivePage>
  )
}
