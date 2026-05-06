import { format } from 'date-fns'
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { PORTAL_DOC_CATEGORIES, isExpired, isExpiringSoon, portalDocCategoryLabel } from '@/lib/portal-documents'
import { PrintButton } from '@/components/portal/print-button'

// Print-friendly composite view of everything an inspector might want to see.
// Used as a one-tap "show me my compliance status" page that the user can
// also print to PDF via the browser's print dialog.
//
// Page is server-rendered; print styles in globals.css hide the chrome
// and the back button, leaving only the printable body.
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
    <div className="space-y-4 print:space-y-3">
      {/* Top chrome — hidden on print */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          href="/portal/documents"
          className="inline-flex items-center gap-1 text-xs text-warm-500 hover:text-ocean-600"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to documents
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-sm border border-warm-200 bg-white p-6 print:border-0 print:p-0">
        {/* Cover header */}
        <div className="border-b border-warm-200 pb-3 mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-warm-500">Inspection Packet</p>
            <h1 className="mt-1 text-xl font-display font-medium text-warm-900">{ctx.client.name}</h1>
            <p className="mt-1 text-xs text-warm-500">
              Generated {format(generatedAt, 'EEEE, MMM d, yyyy h:mm a')}
            </p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-ocean-100 text-ocean-700">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>

        {/* Locations covered */}
        {ctx.locations.length > 0 && (
          <section className="mb-4">
            <h2 className="text-[10px] uppercase tracking-wider text-warm-500 mb-1.5">
              Locations covered ({ctx.locations.length})
            </h2>
            <ul className="space-y-0.5">
              {ctx.locations.map(l => (
                <li key={l.id} className="text-sm text-warm-700">· {l.name}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Documents */}
        <section className="mb-4">
          <h2 className="text-[10px] uppercase tracking-wider text-warm-500 mb-2">
            Compliance documents ({docs.length})
          </h2>
          {docs.length === 0 ? (
            <p className="text-sm text-warm-500">No documents on file.</p>
          ) : (
            <div className="space-y-3">
              {PORTAL_DOC_CATEGORIES.map(cat => {
                const list = docsByCategory.get(cat.value)
                if (!list || list.length === 0) return null
                return (
                  <div key={cat.value}>
                    <h3 className="text-[11px] font-medium text-warm-700">{cat.label}</h3>
                    <ul className="mt-1 space-y-0.5">
                      {list.map(d => {
                        const expired = isExpired(d.expiresAt)
                        const expiringSoon = isExpiringSoon(d.expiresAt)
                        return (
                          <li key={d.id} className="flex items-baseline gap-2 text-xs">
                            <FileText className="h-3 w-3 shrink-0 text-warm-400" />
                            <span className="font-medium text-warm-900">{d.name}</span>
                            <span className="text-warm-500">
                              · uploaded {format(d.createdAt, 'MMM d, yyyy')}
                            </span>
                            {d.expiresAt && (
                              <span className={expired ? 'text-red-600 font-medium' : expiringSoon ? 'text-amber-600 font-medium' : 'text-warm-500'}>
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
        <section className="mb-4">
          <h2 className="text-[10px] uppercase tracking-wider text-warm-500 mb-2">
            Manager cleaning reviews — last 60 days ({recentReviews.length})
          </h2>
          {recentReviews.length === 0 ? (
            <p className="text-sm text-warm-500">No manager reviews logged in the last 60 days.</p>
          ) : (
            <ul className="space-y-1.5">
              {recentReviews.map(r => (
                <li key={r.id} className="flex items-baseline gap-2 text-xs">
                  <span className="text-warm-500 w-20 shrink-0">{format(r.reviewDate, 'MMM d, yyyy')}</span>
                  <span className="font-medium text-warm-900">{r.location.name}</span>
                  <span className="text-warm-500">
                    · rated {Number(r.overallRating).toFixed(1)} by {r.reviewer.firstName} {r.reviewer.lastName}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Open issues */}
        <section className="mb-4">
          <h2 className="text-[10px] uppercase tracking-wider text-warm-500 mb-2">
            Active issues ({openIssues.length})
          </h2>
          {openIssues.length === 0 ? (
            <p className="text-sm text-warm-700">No open issues. All resolved.</p>
          ) : (
            <ul className="space-y-1.5">
              {openIssues.map(i => (
                <li key={i.id} className="text-xs">
                  <span className="font-medium text-warm-900">{i.title}</span>
                  <span className="text-warm-500">
                    {' '}· {i.location.name} · {i.category} · {i.severity} · reported {format(i.createdAt, 'MMM d')} · {i.status.replace('_', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-4 text-[10px] text-warm-400 border-t border-warm-200 pt-2">
          Urban Simple LLC · Austin, TX · This packet reflects state as of {format(generatedAt, 'MMM d, yyyy h:mm a')}.
          For the most current data, visit your portal.
        </p>
      </div>
    </div>
  )
}
