'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// "How was this visit?" 1-5 stars + optional comment on a cleaning-log row.
// Shows the saved rating once the user has rated; they can change it.

const LABELS = ['', 'Poor', 'Not great', 'Okay', 'Good', 'Great']

export function VisitRating({
  locationId,
  locationName,
  serviceDate,
  shiftId,
  initial,
}: {
  locationId: string
  /** Shown when a visit covers more than one of the client's locations. */
  locationName?: string
  serviceDate: string // yyyy-MM-dd
  shiftId?: string
  initial?: { rating: number; comment: string | null } | null
}) {
  const [saved, setSaved] = useState(initial ?? null)
  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState(initial?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState(initial?.comment ?? '')
  const [sending, setSending] = useState(false)

  const submit = async () => {
    if (rating < 1) return
    setSending(true)
    try {
      const res = await fetch('/api/portal/visit-ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, serviceDate, rating, comment, shiftId }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Could not save your rating')
      setSaved({ rating: payload.rating, comment: payload.comment })
      setEditing(false)
      toast.success(rating <= 3 ? 'Thanks. Your account manager will see this.' : 'Thanks for the feedback.')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not save your rating')
    } finally {
      setSending(false)
    }
  }

  const prefix = locationName ? `${locationName}: ` : ''

  if (saved && !editing) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-3 text-[12.5px] text-cream-700">
        <span>{prefix}You rated this visit</span>
        <span className="inline-flex items-center gap-0.5 text-gold-600" aria-label={`${saved.rating} out of 5`}>
          {[1, 2, 3, 4, 5].map(n => (
            <Star key={n} className={cn('h-3.5 w-3.5', n <= saved.rating ? 'fill-current' : 'opacity-30')} />
          ))}
        </span>
        <button
          type="button"
          onClick={() => {
            setRating(saved.rating)
            setComment(saved.comment ?? '')
            setEditing(true)
          }}
          className="font-semibold text-gold-600 hover:underline"
        >
          Change
        </button>
      </div>
    )
  }

  const shown = hover || rating
  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[12.5px] font-semibold text-foreground">{prefix}How was this visit?</span>
        <div className="flex items-center" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              aria-pressed={rating === n}
              className="grid h-9 w-9 place-items-center text-gold-600"
            >
              <Star className={cn('h-5 w-5', n <= shown ? 'fill-current' : 'opacity-35')} />
            </button>
          ))}
        </div>
        {shown > 0 && <span className="text-xs text-muted-foreground">{LABELS[shown]}</span>}
      </div>

      {rating > 0 && (
        <div className="mt-2 space-y-2">
          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder={rating <= 3 ? 'What could have been better? (optional)' : 'Anything to add? (optional)'}
            className="resize-none rounded-[13px] bg-cream-50 text-[13px]"
          />
          <div className="flex justify-end gap-2">
            {editing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => setEditing(false)}
                disabled={sending}
              >
                Cancel
              </Button>
            )}
            <Button
              type="button"
              variant="gold"
              size="sm"
              className="rounded-full px-5"
              onClick={submit}
              disabled={sending}
            >
              {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send rating
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
