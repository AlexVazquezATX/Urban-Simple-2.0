import Link from 'next/link'
import { format } from 'date-fns'
import { FileText, Download, AlertTriangle, ShieldCheck } from 'lucide-react'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { PORTAL_DOC_CATEGORIES, isExpired, isExpiringSoon } from '@/lib/portal-documents'
import { UploadDocumentButton } from '@/components/portal/upload-document-button'
import { DeleteDocumentButton } from '@/components/portal/delete-document-button'

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
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-medium text-warm-900">Documents</h1>
          <p className="mt-1 text-sm text-warm-500">
            Compliance binder for {ctx.client.name}. Inspection-ready.
          </p>
        </div>
        <UploadDocumentButton endpoint="/api/portal/documents" />
      </div>

      {(expiringCount > 0 || expiredCount > 0) && (
        <div className={`rounded-sm border p-3 ${
          expiredCount > 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`h-4 w-4 mt-0.5 ${expiredCount > 0 ? 'text-red-600' : 'text-amber-600'}`} />
            <div className="text-xs">
              {expiredCount > 0 && (
                <p className="font-medium text-red-700">
                  {expiredCount} document{expiredCount === 1 ? '' : 's'} expired
                </p>
              )}
              {expiringCount > 0 && (
                <p className={expiredCount > 0 ? 'text-red-700' : 'font-medium text-amber-700'}>
                  {expiringCount} expiring within 30 days
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <Link
        href="/portal/inspection-packet"
        className="flex items-center justify-between rounded-sm border-2 border-ocean-200 bg-ocean-50/40 p-3 hover:border-ocean-400 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-ocean-100 text-ocean-700">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-warm-900">Inspection Packet</p>
            <p className="text-[11px] text-warm-500">
              One page with all your docs + recent cleaning logs. Print-friendly.
            </p>
          </div>
        </div>
        <span className="text-xs text-ocean-700 font-medium">Open →</span>
      </Link>

      {docs.length === 0 ? (
        <div className="rounded-sm border border-dashed border-warm-300 bg-white p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-warm-300" />
          <p className="mt-2 text-sm text-warm-700">No documents yet.</p>
          <p className="text-xs text-warm-500">
            Upload your COI, training records, permits, or anything an inspector might ask for.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {PORTAL_DOC_CATEGORIES.map(cat => {
            const list = byCategory.get(cat.value)
            if (!list || list.length === 0) return null
            return (
              <section key={cat.value}>
                <h2 className="text-[10px] uppercase tracking-wider text-warm-500 mb-1.5">
                  {cat.label} <span className="text-warm-400">· {list.length}</span>
                </h2>
                <ul className="space-y-1.5">
                  {list.map(d => {
                    const expired = isExpired(d.expiresAt)
                    const expiringSoon = isExpiringSoon(d.expiresAt)
                    return (
                      <li
                        key={d.id}
                        className="flex items-center gap-3 rounded-sm border border-warm-200 bg-white p-2.5"
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${
                          expired ? 'bg-red-50 text-red-600' :
                          expiringSoon ? 'bg-amber-50 text-amber-600' :
                          'bg-warm-100 text-warm-600'
                        }`}>
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-warm-900 truncate">{d.name}</p>
                          <p className="text-[10px] text-warm-500">
                            {format(d.createdAt, 'MMM d, yyyy')}
                            {d.expiresAt && (
                              <>
                                {' · '}
                                <span className={expired ? 'text-red-600 font-medium' : expiringSoon ? 'text-amber-600 font-medium' : ''}>
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
                          className="flex h-8 w-8 items-center justify-center rounded-sm text-warm-600 hover:bg-warm-100 hover:text-ocean-600"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <DeleteDocumentButton docId={d.id} docName={d.name} endpoint={`/api/portal/documents/${d.id}`} />
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
