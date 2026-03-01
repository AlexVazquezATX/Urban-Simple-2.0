'use client'

import { useState } from 'react'
import { Send, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function InlineContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Please fill in all required fields.')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/walkthrough-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: '',
          propertyType: '',
          message: formData.message,
          sourceDetail: 'Inline Contact Form',
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit')
      }

      setIsSuccess(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-ocean-500/20 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-ocean-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Thank you!</h3>
        <p className="text-charcoal-300">
          We&rsquo;ll be in touch within 24 hours to discuss your needs.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="sr-only">Full Name</label>
          <input
            id="contact-name"
            type="text"
            placeholder="Full Name *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-charcoal-400 focus:outline-none focus:border-ocean-400 focus:ring-1 focus:ring-ocean-400 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="sr-only">Email</label>
          <input
            id="contact-email"
            type="email"
            placeholder="Email *"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-charcoal-400 focus:outline-none focus:border-ocean-400 focus:ring-1 focus:ring-ocean-400 transition-colors"
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-phone" className="sr-only">Phone</label>
        <input
          id="contact-phone"
          type="tel"
          placeholder="Phone Number *"
          required
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-charcoal-400 focus:outline-none focus:border-ocean-400 focus:ring-1 focus:ring-ocean-400 transition-colors"
        />
      </div>
      <div>
        <label htmlFor="contact-message" className="sr-only">Message</label>
        <textarea
          id="contact-message"
          placeholder="Tell us about your facility..."
          rows={3}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-charcoal-400 focus:outline-none focus:border-ocean-400 focus:ring-1 focus:ring-ocean-400 transition-colors resize-none"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-xl hover:shadow-2xl transition-all disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-5 h-5 mr-2" />
            Send Message
          </>
        )}
      </Button>
      <p className="text-xs text-charcoal-500 text-center">
        We&rsquo;ll respond within 24 hours. No spam, ever.
      </p>
    </form>
  )
}
