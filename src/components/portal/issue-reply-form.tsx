'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, RotateCcw, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

// Reply composer under an issue/request thread. On a resolved item the
// client can either add a note or reopen it ("This isn't fixed").

const MAX = 4000

export function IssueReplyForm({
  issueId,
  isDone,
  isRequest,
}: {
  issueId: string
  isDone: boolean
  isRequest: boolean
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'reply' | 'reopen' | null>(isDone ? null : 'reply')
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)

  const reopenLabel = isRequest ? "This isn't done" : "This isn't fixed"

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = comment.trim()
    if (!text) {
      toast.error(mode === 'reopen' ? 'Tell us what still needs attention.' : 'Write a reply first.')
      return
    }
    setSending(true)
    try {
      const res = await fetch(`/api/portal/issues/${issueId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: text, reopen: mode === 'reopen' }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to send')
      toast.success(payload.reopened ? 'Reopened. Your account manager has been notified.' : 'Reply sent.')
      setComment('')
      if (isDone) setMode(null)
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  if (!mode) {
    return (
      <div className="mt-5 flex flex-col gap-2 rounded-[18px] border border-border bg-card p-5 shadow-soft sm:flex-row sm:items-center">
        <p className="flex-1 text-[13.5px] text-cream-700">
          {isRequest ? 'Not quite what you needed?' : 'Still not right?'} Let us know.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => setMode('reply')}
          >
            Add a note
          </Button>
          <Button
            type="button"
            variant="gold"
            className="rounded-full"
            onClick={() => setMode('reopen')}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {reopenLabel}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="mt-5 space-y-3 rounded-[18px] border border-border bg-card p-5 shadow-soft"
    >
      <label htmlFor="reply" className="block text-[13px] font-semibold text-foreground">
        {mode === 'reopen' ? 'What still needs attention?' : 'Reply to Urban Simple'}
      </label>
      <Textarea
        id="reply"
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={3}
        maxLength={MAX}
        autoFocus={isDone}
        placeholder={
          mode === 'reopen'
            ? 'The corner by the dish pit still has buildup.'
            : 'Add a detail, answer a question, or say thanks.'
        }
        className="resize-none rounded-[13px] bg-cream-50"
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {isDone && (
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={() => {
              setMode(null)
              setComment('')
            }}
            disabled={sending}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" variant="gold" disabled={sending} className="rounded-full px-6">
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === 'reopen' ? (
            <RotateCcw className="h-3.5 w-3.5" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {mode === 'reopen' ? 'Reopen and send' : 'Send reply'}
        </Button>
      </div>
    </form>
  )
}
