'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface WalkthroughFormProps {
  isOpen: boolean
  onClose: () => void
}

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

  const propertyTypes = [
    'Restaurant',
    'Hotel & Resort',
    'Commercial Kitchen',
    'Event Venue',
    'Spa & Wellness',
    'Other',
  ]

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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-cream-200">
                <div>
                  <h2 className="text-2xl font-display font-semibold text-charcoal-900">
                    Schedule a Walkthrough
                  </h2>
                  <p className="text-sm text-charcoal-600 mt-1">
                    Let's discuss your cleaning needs in person
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-cream-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-charcoal-600" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                {!isSubmitted ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="walkthrough-name" className="text-charcoal-700 mb-2 block">
                          Full Name *
                        </Label>
                        <Input
                          id="walkthrough-name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="John Doe"
                          className="bg-white"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="walkthrough-email" className="text-charcoal-700 mb-2 block">
                          Email Address *
                        </Label>
                        <Input
                          id="walkthrough-email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="john@example.com"
                          className="bg-white"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="walkthrough-phone" className="text-charcoal-700 mb-2 block">
                          Phone Number *
                        </Label>
                        <Input
                          id="walkthrough-phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(555) 123-4567"
                          className="bg-white"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="walkthrough-company" className="text-charcoal-700 mb-2 block">
                          Company Name
                        </Label>
                        <Input
                          id="walkthrough-company"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          placeholder="Your Business"
                          className="bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="walkthrough-property" className="text-charcoal-700 mb-2 block">
                        Property Type
                      </Label>
                      <select
                        id="walkthrough-property"
                        value={formData.propertyType}
                        onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                        className="w-full rounded-md border border-cream-300 bg-white px-3 py-2 text-sm focus:border-bronze-500 focus:ring-2 focus:ring-bronze-500/20 outline-none"
                      >
                        <option value="">Select property type...</option>
                        {propertyTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="walkthrough-message" className="text-charcoal-700 mb-2 block">
                        Tell us about your facility (Optional)
                      </Label>
                      <textarea
                        id="walkthrough-message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Number of kitchens, square footage, special requirements, preferred visit times..."
                        rows={4}
                        className="w-full rounded-md border border-cream-300 bg-white px-3 py-2 text-sm focus:border-bronze-500 focus:ring-2 focus:ring-bronze-500/20 outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-4 pt-4">
                      <Button
                        type="button"
                        onClick={onClose}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !formData.name || !formData.email || !formData.phone}
                        size="lg"
                        className="bg-gradient-to-br from-bronze-500 to-bronze-600 text-white hover:from-bronze-600 hover:to-bronze-700"
                      >
                        {isSubmitting ? 'Submitting...' : 'Request Walkthrough'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center space-y-6 py-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring' }}
                      className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4"
                    >
                      <Check className="w-10 h-10 text-green-600" />
                    </motion.div>
                    <h3 className="text-3xl font-display font-semibold text-charcoal-900 mb-2">
                      Thank You!
                    </h3>
                    <p className="text-lg text-charcoal-600 mb-8 max-w-md mx-auto">
                      We've received your walkthrough request. Our team will contact you within 24 hours to schedule a convenient time.
                    </p>
                    <Button
                      onClick={() => {
                        handleReset()
                        onClose()
                      }}
                      size="lg"
                      className="bg-gradient-to-br from-bronze-500 to-bronze-600 text-white hover:from-bronze-600 hover:to-bronze-700"
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

