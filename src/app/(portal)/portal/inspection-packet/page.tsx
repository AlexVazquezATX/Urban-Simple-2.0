import { format } from 'date-fns'
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { PORTAL_DOC_CATEGORIES, isExpired, isExpiringSoon } from '@/lib/portal-documents'
import { PrintButton } from '@/components/portal/print-button'
import { LivePage } from '@/components/portal/live-shell'

// Print-friendly composite view of everything an inspector might want to see.
// Used as a one-tap "show me my compliance status" page that the user can
// also print to PDF via the browser's print dialog.
//
// Page is server-rendered; print styles in globals.css hide the chrome
// and the back button, leaving only the printable body. Only the screen
// view is restyled to the portal shell — print output is unchanged.
export default async function InspectionPacketPage() {
  const ctx = await requirePortalContext()
  const locationIds = ctx.locations.map(l => l.id)

  // Last 60 days of cleaning logs.
  const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

  const [docs, recentReviews, openIssues] = await Promise.all([
    prisma.portalDocument.findMany({
      where: { clientId: ctx.client.id },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    }),
    locationIds.length > 0
      ? prisma.serviceReview.findMany({
          where: {
            locationId: { in: locationIds },
            reviewDate: { gte: since },
          },
          orderBy: [{ reviewDate: 'desc' }],
          take: 30,
          select: {
            id: true,
            reviewDate: true,
            overallRating: true,
            notes: true,
            location: { select: { name: true } },
            reviewer: { select: { firstName: true, lastName: true } },
          },
        })
      : Promise.resolve([]),
    locationIds.length > 0
      ? prisma.issue.findMany({
          where: {
            clientId: ctx.client.id,
            status: { in: ['open', 'in_progress'] },
          },
          orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            title: true,
            category: true,
            severity: true,
            status: true,
            createdAt: true,
            location: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ])

  const docsByCategory = new Map<string, typeof docs>()
  for (const d of docs) {
    const list = docsByCategory.get(d.category) ?? []
    list.push(d)
    docsByCategory.set(d.category, list)
  }

  const generatedAt = new Date()

  return (
    <LivePage className="space-y-4 print:max-w-none print:space-y-3 print:p-0">
      {/* Top chrome — hidden on print */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          href="/portal/documents"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to documents
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-[18px] border border-border bg-card p-6 shadow-soft print:border-0 print:p-0 print:shadow-none">
        {/* Cover header */}
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[2.4px] text-gold-600">
              Inspection packet
            </p>
            <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.6px] text-foreground">
              {ctx.client.name}
            </h1>
            <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
              Generated {format(generatedAt, 'EEEE, MMM d, yyyy h:mm a')}
            </p>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-600/10 text-gold-600">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>

        {/* Locations covered */}
        {ctx.locations.length > 0 && (
          <section className="mb-5">
            <h2 className="mb-1.5 font-mono text-[10px] uppercase tracking-[2px] text-muted-foreground">
              Locations covered ({ctx.locations.length})
            </h2>
            <ul className="space-y-0.5">
              {ctx.locations.map(l => (
                <li key={l.id} className="text-sm text-cream-700">· {l.name}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Documents */}
        <section className="mb-5">
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[2px] text-muted-foreground">
            Compliance documents ({docs.length})
          </h2>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents on file.</p>
          ) : (
            <div className="space-y-3">
              {PORTAL_DOC_CATEGORIES.map(cat => {
                const list = docsByCategory.get(cat.value)
                if (!list || list.length === 0) return null
                return (
                  <div key={cat.value}>
                    <h3 className="text-[11px] font-semibold text-cream-700">{cat.label}</h3>
                    <ul className="mt-1 space-y-0.5">
                      {list.map(d => {
                        const expired = isExpired(d.expiresAt)
                        const expiringSoon = isExpiringSoon(d.expiresAt)
                        return (
                          <li key={d.id} className="flex items-baseline gap-2 text-xs">
                            <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="font-medium text-foreground">{d.name}</span>
                            <span className="text-muted-foreground">
                              · uploaded {format(d.createdAt, 'MMM d, yyyy')}
                            </span>
                            {d.expiresAt && (
                              <span
                                className={
                                  expired
                                    ? 'font-medium text-coral-600'
                                    : expiringSoon
                                      ? 'font-medium text-gold-600'
                                      : 'text-muted-foreground'
                                }
                              >
                                · {expired ? 'expired' : 'expires'} {format(d.expiresAt, 'MMM d, yyyy')}
                              </span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Recent cleaning reviews */}
        <section className="mb-5">
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[2px] text-muted-foreground">
            Manager cleaning reviews — last 60 days ({recentReviews.length})
          </h2>
          {recentReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No manager reviews logged in the last 60 days.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {recentReviews.map(r => (
                <li key={r.id} className="flex items-baseline gap-2 text-xs">
                  <span className="w-20 shrink-0 font-mono tabular-nums text-muted-foreground">
                    {format(r.reviewDate, 'MMM d, yyyy')}
                  </span>
                  <span className="font-medium text-foreground">{r.location.name}</span>
                  <span className="text-muted-foreground">
                    · rated {Number(r.overallRating).toFixed(1)} by {r.reviewer.firstName}{' '}
                    {r.reviewer.lastName}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Open issues */}
        <section className="mb-5">
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[2px] text-muted-foreground">
            Active issues ({openIssues.length})
          </h2>
          {openIssues.length === 0 ? (
            <p className="text-sm text-cream-700">No open issues. All resolved.</p>
          ) : (
            <ul className="space-y-1.5">
              {openIssues.map(i => (
                <li key={i.id} className="text-xs">
                  <span className="font-medium text-foreground">{i.title}</span>
                  <span className="text-muted-foreground">
                    {' '}· {i.location.name} · {i.category} · {i.severity} · reported{' '}
                    {format(i.createdAt, 'MMM d')} · {i.status.replace('_', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-4 border-t border-border pt-2 text-[10px] text-muted-foreground">
          Urban Simple LLC · Austin, TX · This packet reflects state as of{' '}
          {format(generatedAt, 'MMM d, yyyy h:mm a')}. For the most current data, visit your
          portal.
        </p>
      </div>
    </LivePage>
  )
}
