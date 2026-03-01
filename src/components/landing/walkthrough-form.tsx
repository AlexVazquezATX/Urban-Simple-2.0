'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Shield, Clock, ChefHat, Hotel, UtensilsCrossed, Sparkles, PartyPopper, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { CONTACT } from './landing-data'

interface WalkthroughFormProps {
  isOpen: boolean
  onClose: () => void
}

const propertyTypes = [
  { value: 'Restaurant', label: 'Restaurant', icon: UtensilsCrossed },
  { value: 'Hotel & Resort', label: 'Hotel & Resort', icon: Hotel },
  { value: 'Commercial Kitchen', label: 'Commercial Kitchen', icon: ChefHat },
  { value: 'Event Venue', label: 'Event Venue', icon: PartyPopper },
  { value: 'Spa & Wellness', label: 'Spa & Wellness', icon: Sparkles },
  { value: 'Other', label: 'Other', icon: Shield },
]

export function WalkthroughForm({ isOpen, onClose }: WalkthroughFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    propertyType: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/walkthrough-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to submit')

      setIsSubmitted(true)
    } catch (error) {
      console.error('Error submitting walkthrough request:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      propertyType: '',
      message: '',
    })
    setIsSubmitted(false)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-charcoal-900/80 backdrop-blur-sm z-50"
          />

          {/* Form Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Branded accent bar */}
              <div className="h-1.5 bg-gradient-to-r from-ocean-500 via-bronze-500 to-terracotta-500" />

              {/* Header */}
              <div className="flex items-center justify-between px-8 pt-6 pb-4">
                <div>
                  <h2 className="text-2xl font-display font-semibold text-charcoal-900">
                    Get a Free Quote
                  </h2>
                  <p className="text-sm text-charcoal-500 mt-1">
                    Tell us about your property and we&rsquo;ll customize a cleaning plan for you.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-cream-100 rounded-xl transition-colors -mr-2"
                >
                  <X className="w-5 h-5 text-charcoal-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-8 pb-8">
                {!isSubmitted ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Property Type — Card Selection */}
                    <div>
                      <Label className="text-charcoal-700 mb-3 block text-sm font-medium">
                        What type of property?
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {propertyTypes.map((type) => {
                          const Icon = type.icon
                          const selected = formData.propertyType === type.value
                          return (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, propertyType: type.value })}
                              className={cn(
                                'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center',
                                selected
                                  ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                                  : 'border-cream-200 bg-white text-charcoal-600 hover:border-cream-300 hover:bg-cream-50'
                              )}
                            >
                              <Icon className={cn('w-5 h-5', selected ? 'text-ocean-600' : 'text-charcoal-400')} />
                              <span className="text-xs font-medium leading-tight">{type.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Contact Fields */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="wt-name" className="text-charcoal-700 mb-1.5 block text-sm font-medium">
                          Full Name *
                        </Label>
                        <Input
                          id="wt-name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Your name"
                          className="bg-cream-50/50 border-cream-200 focus:border-ocean-500 focus:ring-ocean-500/20"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="wt-email" className="text-charcoal-700 mb-1.5 block text-sm font-medium">
                          Email *
                        </Label>
                        <Input
                          id="wt-email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="you@company.com"
                          className="bg-cream-50/50 border-cream-200 focus:border-ocean-500 focus:ring-ocean-500/20"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="wt-phone" className="text-charcoal-700 mb-1.5 block text-sm font-medium">
                          Phone *
                        </Label>
                        <Input
                          id="wt-phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(512) 555-0123"
                          className="bg-cream-50/50 border-cream-200 focus:border-ocean-500 focus:ring-ocean-500/20"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="wt-company" className="text-charcoal-700 mb-1.5 block text-sm font-medium">
                          Company Name
                        </Label>
                        <Input
                          id="wt-company"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          placeholder="Your business"
                          className="bg-cream-50/50 border-cream-200 focus:border-ocean-500 focus:ring-ocean-500/20"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="wt-message" className="text-charcoal-700 mb-1.5 block text-sm font-medium">
                        Tell us about your facility <span className="text-charcoal-400 font-normal">(optional)</span>
                      </Label>
                      <textarea
                        id="wt-message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Number of kitchens, square footage, special requirements..."
                        rows={3}
                        className="w-full rounded-xl border border-cream-200 bg-cream-50/50 px-3 py-2.5 text-sm focus:border-ocean-500 focus:ring-2 focus:ring-ocean-500/20 outline-none resize-none"
                      />
                    </div>

                    {/* Submit */}
                    <Button
                      type="submit"
                      disabled={isSubmitting || !formData.name || !formData.email || !formData.phone}
                      size="lg"
                      className="w-full bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-md hover:shadow-lg transition-all h-12 text-base font-semibold rounded-xl"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Request Free Quote'
                      )}
                    </Button>

                    {/* Trust indicators */}
                    <div className="flex items-center justify-center gap-6 pt-1">
                      <div className="flex items-center gap-1.5 text-charcoal-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs">24hr response</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-charcoal-400">
                        <Shield className="w-3.5 h-3.5" />
                        <span className="text-xs">No spam, ever</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-charcoal-400">
                        <Check className="w-3.5 h-3.5" />
                        <span className="text-xs">Free consultation</span>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="text-center space-y-5 py-12">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-ocean-100 to-ocean-200"
                    >
                      <Check className="w-10 h-10 text-ocean-600" />
                    </motion.div>
                    <h3 className="text-2xl font-display font-semibold text-charcoal-900">
                      We&rsquo;ll be in touch!
                    </h3>
                    <p className="text-charcoal-600 max-w-sm mx-auto leading-relaxed">
                      Our team will review your request and reach out within 24 hours to schedule a walkthrough.
                    </p>
                    <p className="text-sm text-charcoal-500">
                      Need faster help? Call us at{' '}
                      <a href={CONTACT.phoneHref} className="text-ocean-600 font-medium hover:underline">
                        {CONTACT.phone}
                      </a>
                    </p>
                    <Button
                      onClick={() => {
                        handleReset()
                        onClose()
                      }}
                      variant="outline"
                      size="lg"
                      className="mt-4 rounded-xl"
                    >
                      Close
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
