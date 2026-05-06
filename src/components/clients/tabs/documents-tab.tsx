'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { FileText, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UploadDocumentButton } from '@/components/portal/upload-document-button'
import { DeleteDocumentButton } from '@/components/portal/delete-document-button'
import { PORTAL_DOC_CATEGORIES, isExpired, isExpiringSoon } from '@/lib/portal-documents'

interface PortalDocRow {
  id: string
  category: string
  name: string
  description: string | null
  fileUrl: string
  fileSize: number | null
  expiresAt: string | null
  uploadedFromPortal: boolean
  createdAt: string
  uploadedBy?: { firstName: string; lastName: string } | null
}

interface DocumentsTabProps {
  clientId: string
}

export function DocumentsTab({ clientId }: DocumentsTabProps) {
  const [docs, setDocs] = useState<PortalDocRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/documents`)
      if (res.ok) {
        const data = await res.json()
        setDocs(data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // Re-fetch when the upload modal closes (router.refresh() is enough but
    // this client-only tab won't see that automatically). Quick & cheap:
    // load on mount, page refresh reloads.
  }, [clientId])

  const byCategory = new Map<string, PortalDocRow[]>()
  for (const d of docs) {
    const list = byCategory.get(d.category) ?? []
    list.push(d)
    byCategory.set(d.category, list)
  }

  return (
    <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">
              Portal Documents
            </CardTitle>
            <CardDescription className="text-warm-500 dark:text-cream-400">
              Compliance binder visible to the client&apos;s portal users. Pre-load COIs, training records, etc.
            </CardDescription>
          </div>
          <UploadDocumentButton endpoint={`/api/clients/${clientId}/documents`} label="Upload" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-warm-500">Loading...</p>
        ) : docs.length === 0 ? (
          <div className="text-center py-8 text-warm-500">
            <FileText className="mx-auto h-8 w-8 text-warm-300" />
            <p className="mt-2 text-sm">No documents yet for this client.</p>
            <p className="text-xs">Upload to make them visible in the portal.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {PORTAL_DOC_CATEGORIES.map(cat => {
              const list = byCategory.get(cat.value)
              if (!list || list.length === 0) return null
              return (
                <section key={cat.value}>
                  <h3 className="text-[10px] uppercase tracking-wider text-warm-500 mb-1.5">
                    {cat.label} <span className="text-warm-400">· {list.length}</span>
                  </h3>
                  <ul className="space-y-1.5">
                    {list.map(d => {
                      const expired = isExpired(d.expiresAt)
                      const expiringSoon = isExpiringSoon(d.expiresAt)
                      return (
                        <li key={d.id} className="flex items-center gap-3 rounded-sm border border-warm-200 dark:border-charcoal-700 p-2.5">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${
                            expired ? 'bg-red-50 text-red-600' :
                            expiringSoon ? 'bg-amber-50 text-amber-600' :
                            'bg-warm-100 text-warm-600'
                          }`}>
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-warm-900 dark:text-cream-100 truncate">{d.name}</p>
                              {d.uploadedFromPortal && (
                                <Badge variant="outline" className="rounded-sm text-[9px] px-1 py-0 border-ocean-200 text-ocean-600">
                                  Client uploaded
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-warm-500">
                              {format(new Date(d.createdAt), 'MMM d, yyyy')}
                              {d.uploadedBy && ` · ${d.uploadedBy.firstName} ${d.uploadedBy.lastName}`}
                              {d.expiresAt && (
                                <>
                                  {' · '}
                                  <span className={expired ? 'text-red-600 font-medium' : expiringSoon ? 'text-amber-600 font-medium' : ''}>
                                    {expired ? 'Expired ' : 'Expires '}
                                    {format(new Date(d.expiresAt), 'MMM d, yyyy')}
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
                          <DeleteDocumentButton
                            docId={d.id}
                            docName={d.name}
                            endpoint={`/api/clients/${clientId}/documents/${d.id}`}
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
      </CardContent>
    </Card>
  )
}
