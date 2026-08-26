'use client'

// Comms Hub client: Attention / All lanes, filters, message drawer with
// thread view, triage actions, and reply composer with AI draft.

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowDownLeft, ArrowUpRight, Inbox, Loader2, Mail, RefreshCw, Search, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'

interface CommRow {
  id: string
  direction: 'inbound' | 'outbound'
  category: string
  fromEmail: string | null
  toEmail: string | null
  subject: string | null
  body: string | null
  prospectId: string | null
  clientId: string | null
  prospectName: string | null
  clientName: string | null
  status: string
  sentAt: string | null
  receivedAt: string | null
  deliveredAt: string | null
  openedAt: string | null
  triageState: string | null
  aiCategory: string | null
  aiSummary: string | null
  createdAt: string
}

const CATEGORY_STYLES: Record<string, string> = {
  outreach: 'bg-bronze-100 text-bronze-800',
  billing: 'bg-sage-100 text-sage-800',
  reply: 'bg-charcoal-900 text-cream-50',
  portal: 'bg-cream-200 text-charcoal-700',
  transactional: 'bg-charcoal-100 text-charcoal-600',
  other: 'bg-charcoal-100 text-charcoal-600',
}

const AI_STYLES: Record<string, string> = {
  interested: 'bg-sage-100 text-sage-800 border-sage-300',
  not_interested: 'bg-charcoal-100 text-charcoal-600',
  question: 'bg-bronze-100 text-bronze-800',
  ooo: 'bg-cream-200 text-charcoal-600',
  unsubscribe: 'bg-red-100 text-red-800',
  other: 'bg-charcoal-100 text-charcoal-600',
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 36e5)
  if (h < 1) return `${Math.max(Math.floor(ms / 6e4), 0)}m ago`
  if (h < 48) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function lifecycle(row: CommRow): string {
  if (row.direction === 'inbound') return 'received'
  return row.status
}

export function CommunicationsClient() {
  const searchParams = useSearchParams()
  const [view, setView] = useState<'attention' | 'all'>('attention')
  const [category, setCategory] = useState<string>('')
  const [q, setQ] = useState(searchParams.get('contact') ?? '')
  const [rows, setRows] = useState<CommRow[]>([])
  const [attentionCount, setAttentionCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // Drawer state
  const [openId, setOpenId] = useState<string | null>(null)
  const [thread, setThread] = useState<CommRow[]>([])
  const [detail, setDetail] = useState<CommRow | null>(null)
  const [replyText, setReplyText] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [sending, setSending] = useState(false)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ view, limit: '25', page: String(p) })
      if (view === 'all' && category) params.set('category', category)
      if (view === 'all' && q.trim()) params.set('q', q.trim())
      const res = await fetch(`/api/communications?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (p === 1) setRows(json.data)
      else setRows((prev) => [...prev, ...json.data.filter((d: CommRow) => !prev.some((x) => x.id === d.id))])
      setTotal(json.pagination.total)
      setAttentionCount(json.counts.attention)
      setPage(p)
    } catch {
      toast.error('Failed to load communications')
    } finally {
      setLoading(false)
    }
  }, [view, category, q])

  useEffect(() => { void load(1) }, [view, category]) // eslint-disable-line react-hooks/exhaustive-deps

  const openMessage = async (id: string) => {
    setOpenId(id)
    setDetail(null)
    setThread([])
    setReplyText('')
    try {
      const res = await fetch(`/api/communications/${id}`)
      const json = await res.json()
      setDetail(json.message)
      setThread(json.thread ?? [])
    } catch {
      toast.error('Failed to load message')
    }
  }

  const triage = async (id: string, triageState: string) => {
    const res = await fetch(`/api/communications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triageState }),
    })
    if (res.ok) {
      toast.success(triageState === 'done' ? 'Marked done' : 'Back in the inbox')
      setOpenId(null)
      void load(1)
    } else toast.error('Update failed')
  }

  const draftWithAi = async () => {
    if (!openId) return
    setDrafting(true)
    try {
      const res = await fetch(`/api/communications/${openId}/draft`, { method: 'POST' })
      const json = await res.json()
      if (res.ok && json.draft) setReplyText(json.draft)
      else toast.error(json.error ?? 'Draft failed')
    } finally {
      setDrafting(false)
    }
  }

  const sendReply = async () => {
    if (!openId || !replyText.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/communications/${openId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyText.trim() }),
      })
      const json = await res.json()
      if (res.ok) {
        toast.success('Reply sent')
        setOpenId(null)
        void load(1)
      } else toast.error(json.error ?? 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-semibold text-charcoal-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-bronze-500" /> Communications
          </h1>
          <p className="text-sm text-charcoal-500">Every email in and out — outreach, billing, portal, replies.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(1)}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Lanes */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={view === 'attention' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('attention')}
        >
          <Inbox className="h-4 w-4 mr-1" />
          Needs attention
          {attentionCount > 0 && (
            <span className="ml-2 rounded-full bg-bronze-500 text-cream-50 text-xs px-2 py-0.5">{attentionCount}</span>
          )}
        </Button>
        <Button variant={view === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setView('all')}>
          All correspondence
        </Button>

        {view === 'all' && (
          <>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 rounded-md border border-charcoal-200 bg-white px-2 text-sm text-charcoal-700"
            >
              <option value="">All categories</option>
              <option value="outreach">Outreach</option>
              <option value="reply">Replies</option>
              <option value="billing">Billing</option>
              <option value="portal">Portal</option>
              <option value="transactional">Transactional</option>
            </select>
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => { e.preventDefault(); void load(1) }}
            >
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-2.5 text-charcoal-400" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject, body, email…" className="h-9 pl-8 w-64" />
              </div>
              <Button type="submit" size="sm" variant="outline">Search</Button>
            </form>
          </>
        )}
      </div>

      {/* List */}
      <div className="rounded-xl border border-charcoal-200 bg-white divide-y divide-charcoal-100">
        {loading && rows.length === 0 ? (
          <div className="p-10 text-center text-charcoal-400"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-charcoal-400">
            {view === 'attention' ? 'Inbox zero — nothing waiting on a reply. 🎉' : 'No messages match.'}
          </div>
        ) : (
          rows.map((r) => (
            <button
              key={r.id}
              onClick={() => openMessage(r.id)}
              className="w-full text-left px-4 py-3 hover:bg-cream-50 transition-colors flex items-start gap-3"
            >
              {r.direction === 'inbound'
                ? <ArrowDownLeft className="h-4 w-4 mt-1 text-bronze-500 shrink-0" />
                : <ArrowUpRight className="h-4 w-4 mt-1 text-charcoal-400 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-charcoal-900 truncate">
                    {r.direction === 'inbound' ? (r.fromEmail ?? 'unknown') : (r.toEmail ?? 'unknown')}
                  </span>
                  {(r.prospectName || r.clientName) && (
                    <span className="text-xs text-charcoal-500 truncate">· {r.prospectName ?? r.clientName}</span>
                  )}
                  <Badge className={`${CATEGORY_STYLES[r.category] ?? CATEGORY_STYLES.other} border-0`}>{r.category}</Badge>
                  {r.aiCategory && r.direction === 'inbound' && (
                    <Badge variant="outline" className={AI_STYLES[r.aiCategory] ?? ''}>{r.aiCategory.replace('_', ' ')}</Badge>
                  )}
                </div>
                <div className="text-sm text-charcoal-700 truncate">{r.subject || '(no subject)'}</div>
                <div className="text-xs text-charcoal-400 truncate">{r.aiSummary || r.body || ''}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-charcoal-400">{timeAgo(r.receivedAt ?? r.sentAt ?? r.createdAt)}</div>
                <div className="text-[11px] uppercase tracking-wide text-charcoal-400">{lifecycle(r)}</div>
              </div>
            </button>
          ))
        )}
      </div>

      {rows.length < total && (
        <div className="text-center">
          <Button variant="outline" size="sm" disabled={loading} onClick={() => load(page + 1)}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Load more (${rows.length} of ${total})`}
          </Button>
        </div>
      )}

      {/* Message drawer */}
      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="pr-8">{detail?.subject || 'Message'}</SheetTitle>
          </SheetHeader>
          {!detail ? (
            <div className="p-8 text-center text-charcoal-400"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
          ) : (
            <div className="space-y-4 mt-2 px-1">
              <div className="flex items-center gap-2 flex-wrap text-sm text-charcoal-600">
                <Badge className={`${CATEGORY_STYLES[detail.category] ?? CATEGORY_STYLES.other} border-0`}>{detail.category}</Badge>
                {detail.aiCategory && <Badge variant="outline" className={AI_STYLES[detail.aiCategory] ?? ''}>{detail.aiCategory.replace('_', ' ')}</Badge>}
                {detail.prospectId && (
                  <Link href={`/growth/prospects/${detail.prospectId}`} className="text-bronze-600 hover:underline">
                    {detail.prospectName ?? 'Prospect'} →
                  </Link>
                )}
                {detail.clientId && (
                  <Link href={`/clients/${detail.clientId}`} className="text-bronze-600 hover:underline">
                    {detail.clientName ?? 'Client'} →
                  </Link>
                )}
              </div>

              {/* Thread */}
              <div className="space-y-3">
                {thread.map((t) => (
                  <div
                    key={t.id}
                    className={`rounded-lg border p-3 text-sm whitespace-pre-wrap ${
                      t.id === detail.id ? 'border-bronze-300 bg-cream-50' : 'border-charcoal-150 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-charcoal-400 mb-1">
                      <span>
                        {t.direction === 'inbound' ? `From ${t.fromEmail ?? '?'}` : `To ${t.toEmail ?? '?'}`}
                      </span>
                      <span>{timeAgo(t.receivedAt ?? t.sentAt ?? t.createdAt)} · {lifecycle(t)}</span>
                    </div>
                    <div className="text-charcoal-800">{t.body || '(no body captured)'}</div>
                  </div>
                ))}
              </div>

              {/* Triage + reply (inbound only) */}
              {detail.direction === 'inbound' && (
                <div className="space-y-3 border-t border-charcoal-150 pt-4">
                  <div className="flex gap-2">
                    {detail.triageState !== 'done' ? (
                      <Button size="sm" variant="outline" onClick={() => triage(detail.id, 'done')}>Mark done</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => triage(detail.id, 'needs_reply')}>Reopen</Button>
                    )}
                    <Button size="sm" variant="outline" disabled={drafting} onClick={draftWithAi}>
                      {drafting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1 text-bronze-500" />}
                      Draft with AI
                    </Button>
                  </div>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply (sends as email, threads into their inbox, logged here automatically)…"
                    rows={7}
                  />
                  <Button size="sm" disabled={sending || !replyText.trim()} onClick={sendReply}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Send reply
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
