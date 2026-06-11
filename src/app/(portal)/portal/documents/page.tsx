import { format } from 'date-fns'
import { AlertTriangle, Download, FileText, ShieldCheck } from 'lucide-react'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { PORTAL_DOC_CATEGORIES, isExpired, isExpiringSoon } from '@/lib/portal-documents'
import { UploadDocumentButton } from '@/components/portal/upload-document-button'
import { DeleteDocumentButton } from '@/components/portal/delete-document-button'
import {
  LiveActionRow,
  LiveEmpty,
  LivePage,
  LivePageHead,
} from '@/components/portal/live-shell'

// Documents — inner-page shell following the LiveLog card language:
// mono gold kicker, display title, white cards, mono meta, pastel alerts.

export default async function PortalDocumentsPage() {
  const ctx = await requirePortalContext()

  const docs = await prisma.portalDocument.findMany({
    where: { clientId: ctx.client.id },
    orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
  })

  const byCategory = new Map<string, typeof docs>()
  for (const d of docs) {
    const list = byCategory.get(d.category) ?? []
    list.push(d)
    byCategory.set(d.category, list)
  }

  const expiringCount = docs.filter(d => isExpiringSoon(d.expiresAt)).length
  const expiredCount = docs.filter(d => isExpired(d.expiresAt)).length

  return (
    <LivePage>
      <LivePageHead
        kicker="Inspection-ready, always"
        title="Documents"
        sub={`The compliance binder for ${ctx.client.name} — everything an inspector might ask for, in one place.`}
        right={<UploadDocumentButton endpoint="/api/portal/documents" />}
      />

      {(expiringCount > 0 || expiredCount > 0) && (
        <div className="mb-4 rounded-2xl border border-peach-line bg-peach-bg px-4 py-3.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-peach-deep" />
            <div className="text-xs text-peach-deep">
              {expiredCount > 0 && (
                <p className="font-semibold">
                  {expiredCount} document{expiredCount === 1 ? '' : 's'} expired
                </p>
              )}
              {expiringCount > 0 && (
                <p className={expiredCount > 0 ? '' : 'font-semibold'}>
                  {expiringCount} expiring within 30 days
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <LiveActionRow
        href="/portal/inspection-packet"
        icon={<ShieldCheck className="h-[17px] w-[17px]" strokeWidth={1.7} />}
        title="Inspection packet"
        sub="One page with all your docs + recent cleaning logs. Print-friendly."
      />

      {docs.length === 0 ? (
        <div className="mt-5">
          <LiveEmpty
            icon={<FileText className="h-4.5 w-4.5" />}
            title="No documents yet — start your binder"
            sub="Upload your COI, training records, permits, or anything an inspector might ask for."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {PORTAL_DOC_CATEGORIES.map(cat => {
            const list = byCategory.get(cat.value)
            if (!list || list.length === 0) return null
            return (
              <section key={cat.value}>
                <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[2px] text-muted-foreground">
                  {cat.label} <span className="opacity-60">· {list.length}</span>
                </h2>
                <ul className="space-y-2">
                  {list.map(d => {
                    const expired = isExpired(d.expiresAt)
                    const expiringSoon = isExpiringSoon(d.expiresAt)
                    return (
                      <li
                        key={d.id}
                        className="flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft"
                      >
                        <div
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                            expired
                              ? 'bg-peach-bg text-peach-deep'
                              : expiringSoon
                                ? 'bg-gold-600/10 text-gold-600'
                                : 'bg-secondary text-cream-700'
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{d.name}</p>
                          <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
                            {format(d.createdAt, 'MMM d, yyyy')}
                            {d.expiresAt && (
                              <>
                                {' · '}
                                <span
                                  className={
                                    expired
                                      ? 'font-medium text-coral-600'
                                      : expiringSoon
                                        ? 'font-medium text-gold-600'
                                        : ''
                                  }
                                >
                                  {expired ? 'Expired ' : 'Expires '}
                                  {format(d.expiresAt, 'MMM d, yyyy')}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <DeleteDocumentButton
                          docId={d.id}
                          docName={d.name}
                          endpoint={`/api/portal/documents/${d.id}`}
                        />
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </LivePage>
  )
}
