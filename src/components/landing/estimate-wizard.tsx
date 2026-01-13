'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChefHat, Hotel, UtensilsCrossed, Calendar, Droplets, Sparkles, Building2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface WizardData {
  propertyType: string | null
  kitchenCount: number
  kitchenSquareFootages: number[]
  diningAreaCount: number
  diningAreaSquareFootages: number[]
  bathroomCount: number
  bathroomSquareFootages: number[]
  nightlyEquipment: boolean
  hoodsFilters: boolean
  diningAreas: boolean
  bathrooms: boolean
  frequency: string | null
  name: string
  email: string
  phone: string
  company: string
  message: string
}

interface EstimateWizardProps {
  isOpen: boolean
  onClose: () => void
}

const propertyTypes = [
  { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, color: 'bronze', bgColor: 'bg-bronze-50', borderColor: 'border-bronze-200', selectedBg: 'bg-bronze-100', selectedBorder: 'border-bronze-500' },
  { id: 'hotel', label: 'Hotel & Resort', icon: Hotel, color: 'ocean', bgColor: 'bg-ocean-50', borderColor: 'border-ocean-200', selectedBg: 'bg-ocean-100', selectedBorder: 'border-ocean-500' },
  { id: 'commercial', label: 'Commercial Kitchen', icon: ChefHat, color: 'bronze', bgColor: 'bg-bronze-50', borderColor: 'border-bronze-200', selectedBg: 'bg-bronze-100', selectedBorder: 'border-bronze-500' },
  { id: 'event', label: 'Event Venue', icon: Calendar, color: 'plum', bgColor: 'bg-plum-50', borderColor: 'border-plum-200', selectedBg: 'bg-plum-100', selectedBorder: 'border-plum-500' },
  { id: 'spa', label: 'Spa & Wellness', icon: Droplets, color: 'terracotta', bgColor: 'bg-terracotta-50', borderColor: 'border-terracotta-200', selectedBg: 'bg-terracotta-100', selectedBorder: 'border-terracotta-500' },
  { id: 'other', label: 'Other', icon: Building2, color: 'charcoal', bgColor: 'bg-cream-50', borderColor: 'border-cream-200', selectedBg: 'bg-cream-100', selectedBorder: 'border-charcoal-500' },
]

const frequencies = [
  { id: '4-nights', label: '4 Nights Per Week', nights: 4 },
  { id: '5-nights', label: '5 Nights Per Week', nights: 5 },
  { id: '6-nights', label: '6 Nights Per Week', nights: 6 },
  { id: '7-nights', label: '7 Nights Per Week', nights: 7 },
]

// Base nightly rates per kitchen (much more realistic)
const propertyTypeRates: Record<string, number> = {
  restaurant: 150,
  hotel: 180,
  commercial: 160,
  event: 140,
  spa: 130,
  other: 150,
}

export function EstimateWizard({ isOpen, onClose }: EstimateWizardProps) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<WizardData>({
    propertyType: null,
    kitchenCount: 1,
    kitchenSquareFootages: [1000],
    diningAreaCount: 0,
    diningAreaSquareFootages: [],
    bathroomCount: 0,
    bathroomSquareFootages: [],
    nightlyEquipment: false,
    hoodsFilters: false,
    diningAreas: false,
    bathrooms: false,
    frequency: null,
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const calculateEstimate = () => {
    if (!data.propertyType || !data.frequency) return null

    const baseKitchenRate = propertyTypeRates[data.propertyType] || propertyTypeRates.other
    
    // Calculate total kitchen area
    const totalKitchenSqFt = data.kitchenSquareFootages.reduce((sum, sqft) => sum + sqft, 0)
    const avgKitchenSqFt = totalKitchenSqFt / data.kitchenCount
    
    // Base rate per kitchen (adjusted for size - larger kitchens cost more)
    // Base rate assumes ~1000 sq ft kitchen, adjust up/down based on size
    const sizeMultiplier = Math.max(0.7, Math.min(1.5, avgKitchenSqFt / 1000))
    const ratePerKitchen = baseKitchenRate * sizeMultiplier
    
    // Total kitchen cost
    let totalNightlyRate = ratePerKitchen * data.kitchenCount
    
    // Add hoods & filters (per kitchen)
    if (data.hoodsFilters) {
      totalNightlyRate += data.kitchenCount * 25
    }
    
    // Add dining areas (if selected)
    if (data.diningAreas && data.diningAreaCount > 0) {
      const totalDiningSqFt = data.diningAreaSquareFootages.reduce((sum, sqft) => sum + sqft, 0)
      // Dining area cleaning: ~$0.15 per sq ft per night
      totalNightlyRate += totalDiningSqFt * 0.15
    }
    
    // Add bathrooms (if selected)
    if (data.bathrooms && data.bathroomCount > 0) {
      // Bathroom cleaning: ~$15 per bathroom per night
      totalNightlyRate += data.bathroomCount * 15
    }
    
    // Get nights per week
    const frequencyData = frequencies.find(f => f.id === data.frequency)
    const nightsPerWeek = frequencyData?.nights || 5
    
    // Weekly estimate
    const weeklyEstimate = totalNightlyRate * nightsPerWeek
    
    // Monthly estimate (4.33 weeks per month)
    const monthlyEstimate = weeklyEstimate * 4.33

    return {
      nightly: Math.round(totalNightlyRate),
      weekly: Math.round(weeklyEstimate),
      monthly: Math.round(monthlyEstimate),
      nightsPerWeek,
    }
  }

  const estimate = calculateEstimate()

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/quote-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          estimate,
        }),
      })

      if (!response.ok) throw new Error('Failed to submit')

      setIsSubmitted(true)
      setStep(6) // Confirmation step
    } catch (error) {
      console.error('Error submitting quote:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetWizard = () => {
    setStep(1)
    setData({
      propertyType: null,
      kitchenCount: 1,
      kitchenSquareFootages: [1000],
      diningAreaCount: 0,
      diningAreaSquareFootages: [],
      bathroomCount: 0,
      bathroomSquareFootages: [],
      nightlyEquipment: false,
      hoodsFilters: false,
      diningAreas: false,
      bathrooms: false,
      frequency: null,
      name: '',
      email: '',
      phone: '',
      company: '',
      message: '',
    })
    setIsSubmitted(false)
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.propertyType !== null
      case 2:
        return data.kitchenCount > 0 && 
               data.kitchenSquareFootages.length === data.kitchenCount &&
               data.kitchenSquareFootages.every(sqft => sqft > 0) &&
               (!data.diningAreas || (data.diningAreaCount > 0 && data.diningAreaSquareFootages.length === data.diningAreaCount && data.diningAreaSquareFootages.every(sqft => sqft > 0))) &&
               (!data.bathrooms || (data.bathroomCount > 0 && data.bathroomSquareFootages.length === data.bathroomCount && data.bathroomSquareFootages.every(sqft => sqft > 0)))
      case 3:
        return data.frequency !== null
      case 4:
        return true // Estimate step, always can proceed
      case 5:
        return data.name.trim() !== '' && data.email.trim() !== '' && data.phone.trim() !== ''
      default:
        return false
    }
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

          {/* Wizard Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-cream-200">
                <div>
                  <h2 className="text-2xl font-display font-semibold text-charcoal-900">
                    Get Your Instant Estimate
                  </h2>
                  <p className="text-sm text-charcoal-600 mt-1">
                    Step {step} of 6
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-cream-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-charcoal-600" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="h-1 bg-cream-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / 5) * 100}%` }}
                          className="h-full bg-gradient-to-r from-bronze-500 to-bronze-600"
                />
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                <AnimatePresence mode="wait">
                  {/* Step 1: Property Type */}
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-display font-semibold text-charcoal-900 mb-2">
                          What type of property?
                        </h3>
                        <p className="text-charcoal-600">Select the type that best matches your business</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {propertyTypes.map((type) => {
                          const Icon = type.icon
                          const isSelected = data.propertyType === type.id
                          return (
                            <button
                              key={type.id}
                              onClick={() => setData({ ...data, propertyType: type.id })}
                              className={`relative group rounded-xl border-2 transition-all p-6 ${
                                isSelected
                                  ? `${type.selectedBg} ${type.selectedBorder} shadow-lg scale-105`
                                  : `${type.bgColor} ${type.borderColor} hover:border-cream-300`
                              }`}
                            >
                              <div className="flex flex-col items-center text-center space-y-3">
                                <div className={`w-16 h-16 rounded-full ${isSelected ? 'bg-white' : 'bg-white/80'} flex items-center justify-center shadow-sm`}>
                                  <Icon className={`w-8 h-8 ${isSelected ? `text-${type.color}-600` : 'text-charcoal-600'}`} />
                                </div>
                                <p className={`font-semibold ${isSelected ? 'text-charcoal-900' : 'text-charcoal-700'}`}>{type.label}</p>
                                {isSelected && (
                                  <div className="absolute top-2 right-2 w-6 h-6 bg-bronze-500 rounded-full flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                  </div>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Kitchen Details */}
                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-display font-semibold text-charcoal-900 mb-2">
                          Tell us about your facilities
                        </h3>
                        <p className="text-charcoal-600">Help us understand your cleaning needs</p>
                      </div>

                      <div className="space-y-8 max-w-2xl mx-auto">
                        {/* Number of Kitchens */}
                        <div>
                          <Label className="text-base font-medium text-charcoal-700 mb-4 block">
                            Number of Kitchens
                          </Label>
                          <div className="flex items-center gap-4">
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={data.kitchenCount}
                              onChange={(e) => {
                                const count = parseInt(e.target.value)
                                const currentSqfts = [...data.kitchenSquareFootages]
                                // Adjust array length
                                while (currentSqfts.length < count) {
                                  currentSqfts.push(1000)
                                }
                                while (currentSqfts.length > count) {
                                  currentSqfts.pop()
                                }
                                setData({ ...data, kitchenCount: count, kitchenSquareFootages: currentSqfts })
                              }}
                              className="flex-1 accent-bronze-600"
                              style={{ accentColor: '#A67C52' }}
                            />
                            <div className="w-16 text-center">
                              <span className="text-2xl font-bold text-bronze-600">{data.kitchenCount}</span>
                            </div>
                          </div>
                        </div>

                        {/* Kitchen Square Footages */}
                        <div className="space-y-4">
                          <Label className="text-base font-medium text-charcoal-700 block">
                            Square Footage for Each Kitchen
                          </Label>
                          {data.kitchenSquareFootages.map((sqft, index) => (
                            <div key={index} className="flex items-center gap-4">
                              <Label className="text-sm text-charcoal-600 w-24">Kitchen {index + 1}:</Label>
                                  <input
                                    type="range"
                                    min="200"
                                    max="5000"
                                    step="50"
                                    value={sqft}
                                    onChange={(e) => {
                                      const newSqfts = [...data.kitchenSquareFootages]
                                      newSqfts[index] = parseInt(e.target.value)
                                      setData({ ...data, kitchenSquareFootages: newSqfts })
                                    }}
                                    className="flex-1 accent-bronze-600"
                                    style={{ accentColor: '#A67C52' }}
                                  />
                              <div className="w-24 text-center">
                                <span className="text-lg font-semibold text-bronze-600">
                                  {sqft.toLocaleString()}
                                </span>
                                <span className="text-xs text-charcoal-600"> sq ft</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Equipment Options */}
                        <div className="pt-4 space-y-3 border-t border-cream-200">
                          <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border border-cream-200 hover:bg-cream-50">
                            <input
                              type="checkbox"
                              checked={data.nightlyEquipment}
                              onChange={(e) => setData({ ...data, nightlyEquipment: e.target.checked })}
                              className="w-5 h-5 rounded border-cream-300 text-bronze-600 focus:ring-bronze-500"
                            />
                            <div className="flex-1">
                              <span className="text-charcoal-700 font-medium">Nightly Equipment Cleaning</span>
                              <p className="text-sm text-charcoal-600">Daily cleaning of kitchen equipment (core service)</p>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border border-cream-200 hover:bg-cream-50">
                            <input
                              type="checkbox"
                              checked={data.hoodsFilters}
                              onChange={(e) => setData({ ...data, hoodsFilters: e.target.checked })}
                              className="w-5 h-5 rounded border-cream-300 text-bronze-600 focus:ring-bronze-500"
                            />
                            <div className="flex-1">
                              <span className="text-charcoal-700 font-medium">Hoods & Filters</span>
                              <p className="text-sm text-charcoal-600">Regular hood and filter maintenance</p>
                            </div>
                          </label>
                        </div>

                        {/* Dining Areas */}
                        <div className="pt-4 space-y-4 border-t border-cream-200">
                          <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border border-cream-200 hover:bg-cream-50">
                            <input
                              type="checkbox"
                              checked={data.diningAreas}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setData({
                                  ...data,
                                  diningAreas: checked,
                                  diningAreaCount: checked ? Math.max(1, data.diningAreaCount) : 0,
                                  diningAreaSquareFootages: checked && data.diningAreaSquareFootages.length === 0 ? [500] : checked ? data.diningAreaSquareFootages : [],
                                })
                              }}
                              className="w-5 h-5 rounded border-cream-300 text-bronze-600 focus:ring-bronze-500"
                            />
                            <div className="flex-1">
                              <span className="text-charcoal-700 font-medium">Dining Area Cleaning</span>
                              <p className="text-sm text-charcoal-600">Dining room and seating areas</p>
                            </div>
                          </label>

                          {data.diningAreas && (
                            <div className="ml-8 space-y-4 pl-4 border-l-2 border-cream-200">
                              <div>
                                <Label className="text-sm font-medium text-charcoal-700 mb-2 block">
                                  Number of Dining Areas
                                </Label>
                                <div className="flex items-center gap-4">
                                  <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={data.diningAreaCount}
                                    onChange={(e) => {
                                      const count = parseInt(e.target.value)
                                      const currentSqfts = [...data.diningAreaSquareFootages]
                                      while (currentSqfts.length < count) {
                                        currentSqfts.push(500)
                                      }
                                      while (currentSqfts.length > count) {
                                        currentSqfts.pop()
                                      }
                                      setData({ ...data, diningAreaCount: count, diningAreaSquareFootages: currentSqfts })
                                    }}
                                    className="flex-1 accent-bronze-600"
                                    style={{ accentColor: '#A67C52' }}
                                  />
                                  <div className="w-16 text-center">
                                    <span className="text-xl font-bold text-bronze-600">{data.diningAreaCount}</span>
                                  </div>
                                </div>
                              </div>

                              {data.diningAreaSquareFootages.map((sqft, index) => (
                                <div key={index} className="flex items-center gap-4">
                                  <Label className="text-sm text-charcoal-600 w-32">Dining Area {index + 1}:</Label>
                                    <input
                                      type="range"
                                      min="100"
                                      max="3000"
                                      step="50"
                                      value={sqft}
                                      onChange={(e) => {
                                        const newSqfts = [...data.diningAreaSquareFootages]
                                        newSqfts[index] = parseInt(e.target.value)
                                        setData({ ...data, diningAreaSquareFootages: newSqfts })
                                      }}
                                      className="flex-1 accent-bronze-600"
                                      style={{ accentColor: '#A67C52' }}
                                    />
                                  <div className="w-24 text-center">
                                    <span className="text-base font-semibold text-bronze-600">
                                      {sqft.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-charcoal-600"> sq ft</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bathrooms */}
                        <div className="pt-4 space-y-4 border-t border-cream-200">
                          <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border border-cream-200 hover:bg-cream-50">
                            <input
                              type="checkbox"
                              checked={data.bathrooms}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setData({
                                  ...data,
                                  bathrooms: checked,
                                  bathroomCount: checked ? Math.max(1, data.bathroomCount) : 0,
                                  bathroomSquareFootages: checked && data.bathroomSquareFootages.length === 0 ? [100] : checked ? data.bathroomSquareFootages : [],
                                })
                              }}
                              className="w-5 h-5 rounded border-cream-300 text-bronze-600 focus:ring-bronze-500"
                            />
                            <div className="flex-1">
                              <span className="text-charcoal-700 font-medium">Bathroom Cleaning</span>
                              <p className="text-sm text-charcoal-600">Restroom maintenance</p>
                            </div>
                          </label>

                          {data.bathrooms && (
                            <div className="ml-8 space-y-4 pl-4 border-l-2 border-cream-200">
                              <div>
                                <Label className="text-sm font-medium text-charcoal-700 mb-2 block">
                                  Number of Bathrooms
                                </Label>
                                <div className="flex items-center gap-4">
                                  <input
                                    type="range"
                                    min="1"
                                    max="20"
                                    value={data.bathroomCount}
                                    onChange={(e) => {
                                      const count = parseInt(e.target.value)
                                      const currentSqfts = [...data.bathroomSquareFootages]
                                      while (currentSqfts.length < count) {
                                        currentSqfts.push(100)
                                      }
                                      while (currentSqfts.length > count) {
                                        currentSqfts.pop()
                                      }
                                      setData({ ...data, bathroomCount: count, bathroomSquareFootages: currentSqfts })
                                    }}
                                    className="flex-1 accent-bronze-600"
                                    style={{ accentColor: '#A67C52' }}
                                  />
                                  <div className="w-16 text-center">
                                    <span className="text-xl font-bold text-bronze-600">{data.bathroomCount}</span>
                                  </div>
                                </div>
                              </div>

                              {data.bathroomSquareFootages.map((sqft, index) => (
                                <div key={index} className="flex items-center gap-4">
                                  <Label className="text-sm text-charcoal-600 w-32">Bathroom {index + 1}:</Label>
                                    <input
                                      type="range"
                                      min="50"
                                      max="500"
                                      step="10"
                                      value={sqft}
                                      onChange={(e) => {
                                        const newSqfts = [...data.bathroomSquareFootages]
                                        newSqfts[index] = parseInt(e.target.value)
                                        setData({ ...data, bathroomSquareFootages: newSqfts })
                                      }}
                                      className="flex-1 accent-bronze-600"
                                      style={{ accentColor: '#A67C52' }}
                                    />
                                  <div className="w-24 text-center">
                                    <span className="text-base font-semibold text-bronze-600">
                                      {sqft.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-charcoal-600"> sq ft</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Frequency */}
                  {step === 3 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-display font-semibold text-charcoal-900 mb-2">
                          How many nights per week?
                        </h3>
                        <p className="text-charcoal-600">Select your preferred service frequency</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        {frequencies.map((freq) => (
                          <button
                            key={freq.id}
                            onClick={() => setData({ ...data, frequency: freq.id })}
                            className={`p-6 rounded-xl border-2 text-left transition-all relative ${
                              data.frequency === freq.id
                                ? 'border-bronze-500 bg-bronze-50 shadow-md'
                                : 'border-cream-200 hover:border-cream-300 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-charcoal-900 mb-1">{freq.label}</h4>
                              </div>
                              {data.frequency === freq.id && (
                                <div className="w-6 h-6 bg-bronze-500 rounded-full flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Estimate Reveal */}
                  {step === 4 && estimate && (
                    <motion.div
                      key="step5"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="space-y-8"
                    >
                      <div className="text-center mb-8">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', delay: 0.2 }}
                          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4"
                        >
                          <Sparkles className="w-10 h-10 text-green-600" />
                        </motion.div>
                        <h3 className="text-3xl font-display font-semibold text-charcoal-900 mb-2">
                          Your Estimated Cost
                        </h3>
                        <p className="text-charcoal-600">Based on your selections</p>
                      </div>

                      <div className="max-w-2xl mx-auto space-y-6">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="bg-gradient-to-br from-bronze-50 to-cream-50 rounded-2xl p-8 border-2 border-bronze-200"
                        >
                          <div className="text-center mb-6">
                            <p className="text-sm text-charcoal-600 mb-2">Estimated Cost Per Night</p>
                            <div className="text-4xl font-bold text-charcoal-900">
                              ${estimate.nightly.toLocaleString()}
                            </div>
                          </div>

                          <div className="pt-6 border-t border-cream-200 space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-charcoal-600">Weekly ({estimate.nightsPerWeek} nights)</span>
                              <span className="text-2xl font-bold text-bronze-600">
                                ${estimate.weekly.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-charcoal-600">Monthly (avg)</span>
                              <span className="text-2xl font-bold text-bronze-600">
                                ${estimate.monthly.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </motion.div>

                        <div className="bg-cream-50 rounded-xl p-6 border border-cream-200">
                          <p className="text-sm text-charcoal-600 text-center">
                            This is an estimate based on your inputs. Get an exact quote by completing the form below.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 5: Contact Info */}
                  {step === 5 && (
                    <motion.div
                      key="step6"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6 max-w-2xl mx-auto"
                    >
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-display font-semibold text-charcoal-900 mb-2">
                          Get Your Exact Quote
                        </h3>
                        <p className="text-charcoal-600">We'll send you a detailed proposal</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="name" className="text-charcoal-700 mb-2 block">
                            Full Name *
                          </Label>
                          <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData({ ...data, name: e.target.value })}
                            placeholder="John Doe"
                            className="bg-white"
                          />
                        </div>

                        <div>
                          <Label htmlFor="email" className="text-charcoal-700 mb-2 block">
                            Email Address *
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData({ ...data, email: e.target.value })}
                            placeholder="john@example.com"
                            className="bg-white"
                          />
                        </div>

                        <div>
                          <Label htmlFor="phone" className="text-charcoal-700 mb-2 block">
                            Phone Number *
                          </Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={data.phone}
                            onChange={(e) => setData({ ...data, phone: e.target.value })}
                            placeholder="(555) 123-4567"
                            className="bg-white"
                          />
                        </div>

                        <div>
                          <Label htmlFor="company" className="text-charcoal-700 mb-2 block">
                            Company Name
                          </Label>
                          <Input
                            id="company"
                            value={data.company}
                            onChange={(e) => setData({ ...data, company: e.target.value })}
                            placeholder="Your Business"
                            className="bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="message" className="text-charcoal-700 mb-2 block">
                          Additional Notes (Optional)
                        </Label>
                        <textarea
                          id="message"
                          value={data.message}
                          onChange={(e) => setData({ ...data, message: e.target.value })}
                          placeholder="Tell us anything else we should know..."
                          rows={4}
                          className="w-full rounded-md border border-cream-300 bg-white px-3 py-2 text-sm focus:border-ocean-500 focus:ring-2 focus:ring-ocean-500/20 outline-none"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Step 6: Confirmation */}
                  {step === 6 && (
                    <motion.div
                      key="step7"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center space-y-6 py-8"
                    >
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
                        We've received your request and will send you a detailed quote within 24 hours.
                      </p>
                      <Button
                        onClick={() => {
                          resetWizard()
                          onClose()
                        }}
                        size="lg"
                        className="bg-gradient-to-br from-bronze-500 to-bronze-600 text-white hover:from-bronze-600 hover:to-bronze-700"
                      >
                        Close
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              {step < 6 && (
                <div className="flex items-center justify-between p-6 border-t border-cream-200">
                  <Button
                    onClick={handleBack}
                    disabled={step === 1}
                    variant="outline"
                  >
                    Back
                  </Button>
                  {step === 5 ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={!canProceed() || isSubmitting}
                      size="lg"
                      className="bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700"
                    >
                      {isSubmitting ? 'Submitting...' : 'Get My Quote'}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed()}
                      size="lg"
                      className="bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
