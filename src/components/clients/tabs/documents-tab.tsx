'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { FileText, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Portal Documents</CardTitle>
            <CardDescription>
              Compliance binder visible to the client&apos;s portal users. Pre-load COIs, training records, etc.
            </CardDescription>
          </div>
          <UploadDocumentButton endpoint={`/api/clients/${clientId}/documents`} label="Upload" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet for this client"
            description="Upload COIs, training records, and other compliance documents to make them visible in the portal."
          />
        ) : (
          <div className="space-y-4">
            {PORTAL_DOC_CATEGORIES.map(cat => {
              const list = byCategory.get(cat.value)
              if (!list || list.length === 0) return null
              return (
                <section key={cat.value}>
                  <h3 className="kicker mb-1.5 text-muted-foreground">
                    {cat.label} <span className="opacity-70">· {list.length}</span>
                  </h3>
                  <ul className="space-y-1.5">
                    {list.map(d => {
                      const expired = isExpired(d.expiresAt)
                      const expiringSoon = isExpiringSoon(d.expiresAt)
                      return (
                        <li key={d.id} className="flex items-center gap-3 rounded-[10px] border border-border p-2.5">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] ${
                            expired ? 'bg-coral-600/10 text-coral-600 dark:bg-coral-300/12 dark:text-coral-300' :
                            expiringSoon ? 'bg-gold-600/10 text-gold-600 dark:bg-gold-400/12 dark:text-gold-400' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                              {d.uploadedFromPortal && (
                                <Badge variant="teal">Client uploaded</Badge>
                              )}
                            </div>
                            <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
                              {format(new Date(d.createdAt), 'MMM d, yyyy')}
                              {d.uploadedBy && ` · ${d.uploadedBy.firstName} ${d.uploadedBy.lastName}`}
                              {d.expiresAt && (
                                <>
                                  {' · '}
                                  <span className={expired ? 'font-medium text-coral-600 dark:text-coral-300' : expiringSoon ? 'font-medium text-gold-600 dark:text-gold-400' : ''}>
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
                            className="flex h-8 w-8 items-center justify-center rounded-[9px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
