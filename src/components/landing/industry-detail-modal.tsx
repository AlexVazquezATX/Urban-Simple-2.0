'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useWalkthrough } from './walkthrough-context'

// ============================================
// TYPES
// ============================================

type IndustryColor = 'ocean' | 'bronze' | 'terracotta' | 'plum' | 'sage' | 'honey'

interface IndustryService {
  label: string
  description: string
}

interface IndustryStat {
  value: string
  label: string
}

export interface IndustryDetail {
  slug: string
  title: string
  tagline: string
  heroImage: string
  description: string
  color: IndustryColor
  services: IndustryService[]
  stats: IndustryStat[]
  valueProps: string[]
  ctaText: string
}

// ============================================
// COLOR THEME MAP
// ============================================

const colorClasses: Record<IndustryColor, {
  accentBar: string
  badge: string
  statValue: string
  checkBg: string
  checkIcon: string
  ctaBg: string
  ctaButton: string
}> = {
  ocean: {
    accentBar: 'from-ocean-400 to-ocean-600',
    badge: 'bg-ocean-500/20 text-ocean-200 border-ocean-400/30',
    statValue: 'text-ocean-600',
    checkBg: 'bg-ocean-100',
    checkIcon: 'text-ocean-600',
    ctaBg: 'from-ocean-600 to-ocean-700',
    ctaButton: 'bg-white text-ocean-700 hover:bg-ocean-50',
  },
  bronze: {
    accentBar: 'from-bronze-400 to-bronze-600',
    badge: 'bg-bronze-500/20 text-bronze-200 border-bronze-400/30',
    statValue: 'text-bronze-600',
    checkBg: 'bg-bronze-100',
    checkIcon: 'text-bronze-600',
    ctaBg: 'from-bronze-600 to-bronze-700',
    ctaButton: 'bg-white text-bronze-700 hover:bg-bronze-50',
  },
  terracotta: {
    accentBar: 'from-terracotta-400 to-terracotta-600',
    badge: 'bg-terracotta-500/20 text-terracotta-200 border-terracotta-400/30',
    statValue: 'text-terracotta-600',
    checkBg: 'bg-terracotta-100',
    checkIcon: 'text-terracotta-600',
    ctaBg: 'from-terracotta-600 to-terracotta-700',
    ctaButton: 'bg-white text-terracotta-700 hover:bg-terracotta-50',
  },
  plum: {
    accentBar: 'from-plum-400 to-plum-600',
    badge: 'bg-plum-500/20 text-plum-200 border-plum-400/30',
    statValue: 'text-plum-600',
    checkBg: 'bg-plum-100',
    checkIcon: 'text-plum-600',
    ctaBg: 'from-plum-600 to-plum-700',
    ctaButton: 'bg-white text-plum-700 hover:bg-plum-50',
  },
  sage: {
    accentBar: 'from-sage-400 to-sage-600',
    badge: 'bg-sage-500/20 text-sage-200 border-sage-400/30',
    statValue: 'text-sage-600',
    checkBg: 'bg-sage-100',
    checkIcon: 'text-sage-600',
    ctaBg: 'from-sage-600 to-sage-700',
    ctaButton: 'bg-white text-sage-700 hover:bg-sage-50',
  },
  honey: {
    accentBar: 'from-honey-400 to-honey-600',
    badge: 'bg-honey-500/20 text-honey-200 border-honey-400/30',
    statValue: 'text-honey-600',
    checkBg: 'bg-honey-100',
    checkIcon: 'text-honey-600',
    ctaBg: 'from-honey-600 to-honey-700',
    ctaButton: 'bg-white text-honey-700 hover:bg-honey-50',
  },
}

// ============================================
// INDUSTRY DETAIL DATA
// ============================================

export const INDUSTRY_DETAILS: IndustryDetail[] = [
  {
    slug: 'hotels-resorts',
    title: 'Hotels & Resorts',
    tagline: 'Elevating every guest touchpoint',
    heroImage: '/images/Services-1767818882/service_Hotels-Hospitality-01.jpg',
    description:
      'From kitchen facilities and dining rooms to lobbies and guest bathrooms, we deliver the invisible standard your guests expect. Our teams work overnight so your property wakes up immaculate every morning — zero disruption to the guest experience.',
    color: 'ocean',
    services: [
      { label: 'Kitchen Deep Cleaning', description: 'Hood systems, equipment degreasing, floor care — our core specialty.' },
      { label: 'Dining Room Sanitation', description: 'Tables, chairs, floors, and buffet areas cleaned to health code standards.' },
      { label: 'Lobby & Common Areas', description: 'First impressions matter. Polished floors, clean surfaces, spotless glass.' },
      { label: 'Restroom Maintenance', description: 'Guest and staff restrooms cleaned and restocked nightly.' },
      { label: 'Pressure Washing', description: 'Entrances, pool decks, and exterior walkways kept pristine.' },
    ],
    stats: [
      { value: '99', label: 'Health inspection scores' },
      { value: '24/7', label: 'Service availability' },
      { value: '15+', label: 'Years serving TX hotels' },
    ],
    valueProps: [
      'Zero disruption to guest experience — our crews work overnight',
      'Certified for food service environments with full documentation',
      'Scalable from boutique properties to 500+ room resorts',
    ],
    ctaText: 'Schedule a Hotel Walkthrough',
  },
  {
    slug: 'restaurants-bars',
    title: 'Restaurants & Bars',
    tagline: 'Your kitchen deserves a spotless reputation',
    heroImage: '/images/Services-1767818882/service_Restaurant-Cleaning-01.jpg',
    description:
      'We specialize in the back-of-house environments that health inspectors scrutinize most. From deep kitchen degreasing to dining room sanitation, our team works around your hours so you open every shift with confidence.',
    color: 'bronze',
    services: [
      { label: 'Kitchen Deep Cleaning', description: 'Hoods, grease traps, equipment, walls, and floors — thorough and documented.' },
      { label: 'Dining Area Sanitation', description: 'Tables, booths, floors, and bar surfaces cleaned to health code standards.' },
      { label: 'Restroom Deep Clean', description: 'Guest-facing restrooms cleaned, sanitized, and restocked every night.' },
      { label: 'Bar & Lounge Areas', description: 'Bar tops, back bar, floors, and glass — ready for service.' },
      { label: 'Health Code Compliance', description: 'Detailed checklists and photo documentation after every service.' },
    ],
    stats: [
      { value: '500+', label: 'Restaurant clients served' },
      { value: '99.8%', label: 'Client retention rate' },
      { value: '4hrs', label: 'Avg nightly turnaround' },
    ],
    valueProps: [
      'We work after close, before open — zero impact on service hours',
      'Health code documentation and checklist verification every visit',
      'Flexible scheduling that adapts to your busiest seasons',
    ],
    ctaText: 'Schedule a Restaurant Walkthrough',
  },
  {
    slug: 'commercial-kitchens',
    title: 'Commercial Kitchens',
    tagline: 'Where sanitation meets precision',
    heroImage: '/images/Services-1767818882/service_Kitchen-Cleaning-03.jpg',
    description:
      'Commercial kitchen deep cleaning is our core specialty — it is what built our reputation over 15 years. We handle hood systems, equipment degreasing, floor care, cold storage, and every surface health inspectors check. Certified, insured, and documented.',
    color: 'terracotta',
    services: [
      { label: 'Hood & Exhaust Systems', description: 'Complete degreasing of hoods, filters, ducts, and exhaust fans.' },
      { label: 'Equipment Degreasing', description: 'Ovens, fryers, grills, flat-tops, and prep stations deep cleaned.' },
      { label: 'Floor Care', description: 'Degreasing, scrubbing, and sealing of kitchen floors and drains.' },
      { label: 'Cold Storage Cleaning', description: 'Walk-in coolers and freezers sanitized, shelves cleaned and organized.' },
      { label: 'Inspection-Ready Documentation', description: 'Photo evidence and digital checklists for every service delivered.' },
    ],
    stats: [
      { value: '15+', label: 'Years of kitchen expertise' },
      { value: '99', label: 'Avg health inspection score' },
      { value: '1000+', label: 'Kitchens cleaned annually' },
    ],
    valueProps: [
      'Our #1 specialty — more kitchen cleaning experience than anyone in Texas',
      'Every service includes photo documentation and digital checklists',
      'EPA-approved, food-safe products that protect your staff and guests',
    ],
    ctaText: 'Schedule a Kitchen Walkthrough',
  },
  {
    slug: 'event-venues',
    title: 'Event Venues',
    tagline: 'From black-tie to breakdown, spotless every time',
    heroImage: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&h=800&fit=crop&q=80',
    description:
      'Banquet halls, ballrooms, and event spaces demand rapid turnaround between events. Our teams handle kitchen cleaning, carpet care, pressure washing, and full venue resets — so your next event starts with a blank canvas.',
    color: 'plum',
    services: [
      { label: 'Post-Event Deep Clean', description: 'Complete venue reset — floors, surfaces, restrooms, and kitchen.' },
      { label: 'Ballroom Carpet Cleaning', description: 'Deep extraction and spot treatment for high-traffic event carpet.' },
      { label: 'Kitchen & Catering Areas', description: 'Catering kitchens and prep areas degreased and sanitized.' },
      { label: 'Pressure Washing', description: 'Exterior entrances, patios, and loading areas cleaned between events.' },
      { label: 'Rapid Turnaround Service', description: 'Same-night cleaning for back-to-back event schedules.' },
    ],
    stats: [
      { value: '6hr', label: 'Avg full venue turnaround' },
      { value: '24/7', label: 'Event schedule flexibility' },
      { value: '100%', label: 'On-time delivery rate' },
    ],
    valueProps: [
      'Same-night turnaround — your venue is ready before the next event',
      'Combined kitchen + venue cleaning in a single crew deployment',
      'Flexible scheduling that adapts to your event calendar',
    ],
    ctaText: 'Schedule a Venue Walkthrough',
  },
  {
    slug: 'spas-wellness',
    title: 'Spas & Wellness',
    tagline: 'Pristine spaces for total relaxation',
    heroImage: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=1200&h=800&fit=crop&q=80',
    description:
      'Wellness environments demand the highest standards of cleanliness. We service kitchen facilities, treatment rooms, relaxation areas, locker rooms, and pool areas with eco-friendly products that are safe for both guests and the environment.',
    color: 'sage',
    services: [
      { label: 'Kitchen & Juice Bar Cleaning', description: 'Food prep areas and juice bars sanitized to health code standards.' },
      { label: 'Treatment Room Sanitation', description: 'Surfaces, floors, and equipment deep cleaned between services.' },
      { label: 'Locker Room & Shower Areas', description: 'Tile, grout, drains, and fixtures sanitized and polished daily.' },
      { label: 'Pool & Sauna Areas', description: 'Deck surfaces, railings, and surrounding areas kept spotless.' },
      { label: 'Green Cleaning Products', description: 'EPA-approved, guest-safe, eco-friendly products throughout.' },
    ],
    stats: [
      { value: '100%', label: 'Eco-friendly products' },
      { value: '0', label: 'Harsh chemical residue' },
      { value: '15+', label: 'Years in hospitality' },
    ],
    valueProps: [
      'Exclusively eco-friendly, guest-safe cleaning products',
      'Discreet overnight service — never disrupts the guest experience',
      'Specialized training for wellness and healthcare-adjacent environments',
    ],
    ctaText: 'Schedule a Spa Walkthrough',
  },
  {
    slug: 'boutique-hotels',
    title: 'Boutique Hotels',
    tagline: 'Where every detail tells your story',
    heroImage: '/images/Headers-1767818867/header_culinary-facilities-cleaning-01.jpg',
    description:
      'Boutique properties live and die by the details. We provide the same caliber of cleaning used by 500-room resorts, tailored to the intimate scale and unique character of your property. Kitchen facilities, dining rooms, bathrooms, and common areas — all handled with care.',
    color: 'honey',
    services: [
      { label: 'Kitchen & Dining Cleaning', description: 'Restaurant-grade kitchen and dining area cleaning for your on-site F&B.' },
      { label: 'Common Area Care', description: 'Lobbies, lounges, and shared spaces maintained to the highest standard.' },
      { label: 'Restroom Deep Clean', description: 'Guest and staff restrooms cleaned, sanitized, and restocked.' },
      { label: 'Specialty Surface Care', description: 'Custom materials, fixtures, and finishes treated with appropriate products.' },
      { label: 'Flexible Crew Sizing', description: 'Right-sized teams for your property — no waste, no gaps.' },
    ],
    stats: [
      { value: '50+', label: 'Boutique properties served' },
      { value: '99.8%', label: 'Client retention rate' },
      { value: '24hr', label: 'Response time guarantee' },
    ],
    valueProps: [
      'Right-sized for your property — no oversized crews, no wasted budget',
      'Understanding of unique finishes, custom surfaces, and specialty materials',
      'Dedicated account manager who knows your property inside and out',
    ],
    ctaText: 'Schedule a Property Walkthrough',
  },
]

// ============================================
// COMPONENT
// ============================================

interface IndustryDetailModalProps {
  industry: IndustryDetail | null
  onClose: () => void
}

export function IndustryDetailModal({ industry, onClose }: IndustryDetailModalProps) {
  const { open: openWalkthrough } = useWalkthrough()

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (industry) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [industry, onClose])

  const handleCTA = () => {
    onClose()
    // Small delay so the exit animation plays before the walkthrough opens
    setTimeout(openWalkthrough, 200)
  }

  return (
    <AnimatePresence>
      {industry && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-charcoal-900/80 backdrop-blur-sm z-50"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto"
            >
              {/* Accent Bar */}
              <div className={cn('h-1 bg-gradient-to-r shrink-0', colorClasses[industry.color].accentBar)} />

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {/* HERO */}
                <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9]">
                  <Image
                    src={industry.heroImage}
                    alt={industry.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/90 via-charcoal-900/40 to-charcoal-900/10" />

                  {/* Close Button */}
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full transition-colors z-10"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>

                  {/* Hero Text */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                    <Badge variant="secondary" className={cn('mb-3', colorClasses[industry.color].badge)}>
                      {industry.title}
                    </Badge>
                    <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-white leading-tight tracking-tight">
                      {industry.tagline}
                    </h2>
                  </div>
                </div>

                {/* DESCRIPTION */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="px-6 sm:px-8 py-6"
                >
                  <p className="text-charcoal-600 text-base sm:text-lg leading-relaxed">
                    {industry.description}
                  </p>
                </motion.div>

                {/* STATS ROW */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="px-6 sm:px-8 pb-6"
                >
                  <div className="grid grid-cols-3 divide-x divide-cream-200 bg-cream-50 rounded-2xl py-6">
                    {industry.stats.map((stat, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 200,
                          damping: 15,
                          delay: 0.2 + i * 0.1,
                        }}
                        className="text-center px-2 sm:px-4"
                      >
                        <div className={cn('font-display text-xl sm:text-2xl lg:text-3xl font-semibold', colorClasses[industry.color].statValue)}>
                          {stat.value}
                        </div>
                        <div className="text-xs sm:text-sm text-charcoal-500 mt-1">{stat.label}</div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* SERVICES GRID */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  className="px-6 sm:px-8 py-6 bg-cream-50/50"
                >
                  <h3 className="text-lg font-semibold text-charcoal-900 mb-4">
                    What we do for {industry.title.toLowerCase()}
                  </h3>
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.06, delayChildren: 0.3 } },
                    }}
                    className="grid sm:grid-cols-2 gap-3"
                  >
                    {industry.services.map((service, i) => (
                      <motion.div
                        key={i}
                        variants={{
                          hidden: { opacity: 0, x: -12 },
                          visible: { opacity: 1, x: 0 },
                        }}
                        className="flex gap-3 items-start p-4 bg-white rounded-xl border border-cream-200"
                      >
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', colorClasses[industry.color].checkBg)}>
                          <Check className={cn('w-4 h-4', colorClasses[industry.color].checkIcon)} />
                        </div>
                        <div>
                          <p className="font-medium text-charcoal-900 text-sm">{service.label}</p>
                          <p className="text-charcoal-500 text-sm mt-0.5 leading-relaxed">{service.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>

                {/* VALUE PROPOSITIONS */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.4 }}
                  className="px-6 sm:px-8 py-6"
                >
                  <h3 className="text-lg font-semibold text-charcoal-900 mb-4">
                    The Urban Simple difference
                  </h3>
                  <div className="space-y-3">
                    {industry.valueProps.map((prop, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5', colorClasses[industry.color].checkBg)}>
                          <Check className={cn('w-3.5 h-3.5', colorClasses[industry.color].checkIcon)} />
                        </div>
                        <p className="text-charcoal-700 leading-relaxed">{prop}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className={cn('mx-6 sm:mx-8 mb-6 sm:mb-8 rounded-2xl p-6 sm:p-8 text-center bg-gradient-to-br', colorClasses[industry.color].ctaBg)}
                >
                  <h3 className="text-lg sm:text-xl font-display font-semibold text-white mb-2">
                    Ready to elevate your standards?
                  </h3>
                  <p className="text-white/80 text-sm mb-5">
                    Free consultation. No commitment. Custom plan within 24 hours.
                  </p>
                  <Button
                    onClick={handleCTA}
                    size="lg"
                    className={cn('shadow-lg hover:shadow-xl transition-all', colorClasses[industry.color].ctaButton)}
                  >
                    {industry.ctaText}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
