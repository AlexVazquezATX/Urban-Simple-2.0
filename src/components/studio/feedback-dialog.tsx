'use client'

import { useState } from 'react'
import { Star, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature_request', label: 'Feature Request' },
]

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setRating(0)
    setHoveredRating(0)
    setCategory('general')
    setMessage('')
  }

  async function handleSubmit() {
    if (!rating || !message.trim()) {
      toast.error('Please add a rating and message')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/creative-studio/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, category, message }),
      })

      if (!res.ok) throw new Error('Failed to submit')

      toast.success('Thanks for your feedback!')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to submit feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-warm-900">Send Feedback</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Star Rating */}
          <div>
            <label className="text-sm font-medium text-warm-700 mb-2 block">
              How&apos;s your experience?
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      'w-7 h-7 transition-colors',
                      (hoveredRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-warm-300'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-warm-700 mb-2 block">
              Category
            </label>
            <div className="flex gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    category === cat.value
                      ? 'bg-warm-900 text-white'
                      : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="text-sm font-medium text-warm-700 mb-2 block">
              Your feedback
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think, what could be better, or report an issue..."
              rows={4}
              className="w-full rounded-md border border-warm-200 bg-white px-3 py-2 text-sm text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-400 focus:border-transparent resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-md"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !rating || !message.trim()}
              className="bg-warm-900 text-white hover:bg-warm-800 rounded-md"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : null}
              Submit Feedback
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
