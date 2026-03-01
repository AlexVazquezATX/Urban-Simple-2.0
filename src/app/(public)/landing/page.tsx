'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { PublicNav } from '@/components/landing/public-nav'
import {
  Sparkles,
  Users,
  Building2,
  Shield,
  BarChart3,
  Check,
  ArrowRight,
  Star,
  ChefHat,
  UtensilsCrossed,
  Hotel,
  Droplets,
  Calendar,
  Home,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ROICalculator } from '@/components/landing/roi-calculator'
import { FloatingQuoteCTA } from '@/components/landing/floating-quote-cta'
import { cn } from '@/lib/utils'

// ============================================
// CONTENT DATA
// ============================================

const features = [
  {
    icon: <Hotel className="w-6 h-6" />,
    title: 'Hotel & Resort Cleaning',
    description: 'Kitchen facilities, dining rooms, bathrooms, lobbies, and common areas. Our specialty is kitchen cleaning with comprehensive support services.',
    color: 'ocean',
  },
  {
    icon: <UtensilsCrossed className="w-6 h-6" />,
    title: 'Restaurant & Bar Services',
    description: 'Deep kitchen cleaning is our specialty. Plus dining area sanitation, bathrooms, and health code compliance. We work around your hours.',
    color: 'bronze',
  },
  {
    icon: <ChefHat className="w-6 h-6" />,
    title: 'Commercial Kitchen Deep Cleaning',
    description: 'Hood systems, equipment degreasing, and floor care. Certified for food service environments. Our core specialty.',
    color: 'terracotta',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Health Code Compliance',
    description: 'Documentation, checklist verification, and inspection-ready standards every single time.',
    color: 'ocean',
  },
  {
    icon: <Droplets className="w-6 h-6" />,
    title: 'Green Cleaning Solutions',
    description: 'EPA-approved, guest-safe products. Sustainable practices that protect your reputation.',
    color: 'sage',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Quality Reporting',
    description: 'Digital checklists, photo documentation, and detailed reports after every service.',
    color: 'bronze',
  },
]

const stats = [
  { value: '500+', label: 'Hospitality Clients', suffix: '' },
  { value: '15', label: 'Years Experience', suffix: '+' },
  { value: '99.8', label: 'Client Retention', suffix: '%' },
  { value: '24/7', label: 'Service Available', suffix: '' },
]

const testimonials = [
  {
    quote: 'Urban Simple transformed our hotel cleaning operations. Their attention to detail and reliability are unmatched. Guests constantly compliment our cleanliness.',
    author: 'Patricia Williams',
    role: 'General Manager',
    company: 'Seaside Grand Hotel',
    rating: 5,
  },
  {
    quote: 'The kitchen deep cleaning service is exceptional. They work with our schedule and meet every health code requirement. True hospitality professionals.',
    author: 'Chef Marcus Thompson',
    role: 'Executive Chef',
    company: 'The Sterling Restaurant Group',
    rating: 5,
  },
  {
    quote: 'Managing 12 locations, consistency is everything. Urban Simple delivers the same high standards across all our properties. They are an extension of our team.',
    author: 'Diana Chen',
    role: 'Regional Director',
    company: 'Metro Hospitality Partners',
    rating: 5,
  },
]

// ============================================
// ANIMATIONS
// ============================================

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

// ============================================
// COMPONENTS
// ============================================

function CountUp({ value, suffix = '' }: { value: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [displayValue, setDisplayValue] = useState('0')

  useEffect(() => {
    if (isInView) {
      const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''))
      const hasPlus = value.includes('+')
      const duration = 2000
      const steps = 60
      const stepDuration = duration / steps
      let currentStep = 0

      const timer = setInterval(() => {
        currentStep++
        const progress = currentStep / steps
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const currentValue = Math.floor(numericValue * easeOut)

        if (value.includes(',')) {
          setDisplayValue(currentValue.toLocaleString() + (hasPlus ? '+' : ''))
        } else if (value.includes('%')) {
          setDisplayValue(currentValue + '%')
        } else if (value.includes('/')) {
          setDisplayValue(value)
        } else {
          setDisplayValue(currentValue.toLocaleString() + (hasPlus ? '+' : ''))
        }

        if (currentStep >= steps) {
          clearInterval(timer)
          setDisplayValue(value + suffix)
        }
      }, stepDuration)

      return () => clearInterval(timer)
    }
  }, [isInView, value, suffix])

  return (
    <span ref={ref} className="tabular-nums">
      {displayValue}
    </span>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      <PublicNav />

      {/* ============================================
          HERO SECTION
          ============================================ */}
      <section className="relative pt-24 pb-12 lg:pt-32 lg:pb-16 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(166 124 82 / 0.15) 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-ocean-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-bronze-200/30 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="text-center lg:text-left"
            >
              <motion.div variants={fadeInUp}>
                <Badge variant="secondary" className="mb-6 bg-ocean-100 text-ocean-700 border-ocean-200">
                  <Sparkles className="w-4 h-4 mr-1" />
                  Trusted by 500+ Hospitality Brands
                </Badge>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-charcoal-900 leading-[1.1] tracking-tight mb-6"
              >
                Premier cleaning for{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-bronze-500 to-bronze-600">hospitality excellence</span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg sm:text-xl text-charcoal-600 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0"
              >
                Specialized commercial kitchen cleaning for hotels, resorts, restaurants, and event venues.
                Plus dining rooms, bathrooms, lobbies, and common areas. We maintain the pristine standards your guests expect.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
              >
                <a href="#contact">
                  <Button
                    size="lg"
                    className="bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-lg hover:shadow-xl transition-all"
                  >
                    Get a Free Quote
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </a>
                <a href="#services">
                  <Button variant="outline" size="lg" className="border-plum-300 text-plum-700 hover:bg-plum-50 hover:border-plum-400">
                    View Services
                  </Button>
                </a>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                variants={fadeInUp}
                className="mt-12 pt-8 border-t border-cream-300"
              >
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 text-sm text-charcoal-600">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-ocean-600" />
                    <span>Certified & Insured</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-ocean-600" />
                    <span>24/7 Service Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-ocean-600" />
                    <span>Eco-Friendly Products</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right - Hero Image */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-lifted">
                <div className="aspect-[4/3] relative">
                  <Image
                    src="/images/Services-1767818882/service_Kitchen-Cleaning-01.jpg"
                    alt="Professional commercial kitchen cleaning"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/20 via-transparent to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================
          SERVICES SECTION
          ============================================ */}
      <section id="services" className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4 bg-ocean-100 text-ocean-700 border-ocean-200">
                Our Services
              </Badge>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-charcoal-900 leading-tight tracking-tight mb-4">
                Comprehensive hospitality cleaning
              </h2>
              <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
                Commercial kitchen cleaning is our specialty. We also service dining rooms, bathrooms, lobbies, common areas, and provide pressure washing and ballroom carpet cleaning.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <div className="h-full p-8 rounded-2xl border border-cream-200 bg-gradient-to-b from-cream-50 to-white hover:shadow-card transition-all duration-300 hover:border-ocean-200">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-6',
                    feature.color === 'ocean' && 'bg-ocean-100 text-ocean-600',
                    feature.color === 'bronze' && 'bg-bronze-100 text-bronze-600',
                    feature.color === 'terracotta' && 'bg-terracotta-100 text-terracotta-600',
                    feature.color === 'sage' && 'bg-sage-100 text-sage-600'
                  )}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-charcoal-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-charcoal-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          INDUSTRIES SECTION
          ============================================ */}
      <section id="industries" className="py-16 lg:py-20 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4 bg-bronze-100 text-bronze-700 border-bronze-200">
                Industries We Serve
              </Badge>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-charcoal-900 leading-tight tracking-tight mb-4">
                Specialized cleaning for every hospitality space
              </h2>
              <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
                Commercial kitchen cleaning is our specialty. We also service dining rooms, bathrooms, lobbies, common areas, and provide pressure washing and carpet cleaning services.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          >
            {/* Hotel */}
            <motion.div variants={fadeInUp} className="group">
              <div className="relative rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300">
                <div className="aspect-[4/3] relative">
                  <Image
                    src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop&q=80"
                    alt="Hotel kitchen facilities and common areas"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/95 via-charcoal-900/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-ocean-500/90 backdrop-blur-sm flex items-center justify-center">
                      <Hotel className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white">Hotels & Resorts</h3>
                  </div>
                  <p className="text-white/90 leading-relaxed min-h-[3rem]">
                    Kitchen facilities, dining rooms, bathrooms, lobbies, and common areas.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Restaurant */}
            <motion.div variants={fadeInUp} className="group">
              <div className="relative rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300">
                <div className="aspect-[4/3] relative">
                  <Image
                    src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop&q=80"
                    alt="Upscale restaurant dining area with elegant ambiance"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/95 via-charcoal-900/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-bronze-500/90 backdrop-blur-sm flex items-center justify-center">
                      <UtensilsCrossed className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white">Restaurants & Bars</h3>
                  </div>
                  <p className="text-white/90 leading-relaxed min-h-[3rem]">
                    Kitchen cleaning, dining areas, bars, and front-of-house spaces that impress guests.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Kitchen */}
            <motion.div variants={fadeInUp} className="group">
              <div className="relative rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300">
                <div className="aspect-[4/3] relative">
                  <Image
                    src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&h=600&fit=crop&q=80"
                    alt="Professional commercial kitchen with stainless steel equipment"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/95 via-charcoal-900/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-terracotta-500/90 backdrop-blur-sm flex items-center justify-center">
                      <ChefHat className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white">Commercial Kitchens</h3>
                  </div>
                  <p className="text-white/90 leading-relaxed min-h-[3rem]">
                    Deep cleaning, degreasing, and health code compliance for food service environments.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Event Venues */}
            <motion.div variants={fadeInUp} className="group">
              <div className="relative rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300">
                <div className="aspect-[4/3] relative">
                  <Image
                    src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&h=600&fit=crop&q=80"
                    alt="Elegant event venue with banquet hall setup"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/95 via-charcoal-900/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-plum-500/90 backdrop-blur-sm flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white">Event Venues</h3>
                  </div>
                  <p className="text-white/90 leading-relaxed min-h-[3rem]">
                    Banquet halls, ballrooms, and event spaces. Carpet cleaning and pressure washing services.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Spas & Wellness */}
            <motion.div variants={fadeInUp} className="group">
              <div className="relative rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300">
                <div className="aspect-[4/3] relative">
                  <Image
                    src="/images/Services-1767818882/service_Hotels-Hospitality-01.jpg"
                    alt="Luxury spa and wellness center with serene atmosphere"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/95 via-charcoal-900/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-sage-500/90 backdrop-blur-sm flex items-center justify-center">
                      <Droplets className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white">Spas & Wellness</h3>
                  </div>
                  <p className="text-white/90 leading-relaxed min-h-[3rem]">
                    Kitchen facilities, treatment rooms, relaxation areas, and wellness facilities kept pristine.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Boutique Hotels */}
            <motion.div variants={fadeInUp} className="group">
              <div className="relative rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300">
                <div className="aspect-[4/3] relative">
                  <Image
                    src="https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop&q=80"
                    alt="Charming boutique hotel with unique character and design"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/95 via-charcoal-900/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-honey-500/90 backdrop-blur-sm flex items-center justify-center">
                      <Home className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white">Boutique Hotels</h3>
                  </div>
                  <p className="text-white/90 leading-relaxed min-h-[3rem]">
                    Kitchen facilities, dining rooms, bathrooms, and common areas for intimate properties.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          STATS SECTION
          ============================================ */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900 relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1920&h=1080&fit=crop&q=80"
            alt="Restaurant kitchen"
            fill
            className="object-cover opacity-30"
            priority={false}
          />
        </div>
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal-900/85 via-charcoal-800/85 to-charcoal-900/85" />
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-ocean-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-plum-500/15 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.div variants={fadeInUp}>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight tracking-tight mb-4">
                Trusted by hospitality leaders
              </h2>
              <p className="text-lg text-charcoal-300 max-w-2xl mx-auto">
                Industry-leading service with proven results across hundreds of properties.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="text-center"
              >
                <div className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-white mb-2">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-charcoal-400">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          CLIENT LOGOS SECTION
          ============================================ */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4 bg-cream-200 text-charcoal-700 border-cream-300">
                Trusted By
              </Badge>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-charcoal-900 leading-tight tracking-tight mb-4">
                Notable Hospitality Brands
              </h2>
              <p className="text-base text-charcoal-600 max-w-xl mx-auto">
                We're proud to serve some of the most recognized names in hospitality.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid grid-cols-3 md:grid-cols-7 gap-6 lg:gap-8 items-center justify-items-center opacity-60 hover:opacity-100 transition-opacity"
          >
            {[
              { name: 'Facebook', image: '/images/Clients-1767818842/current client logos/client-brand_Facebook.jpg' },
              { name: 'Darden Group', image: '/images/Clients-1767818842/current client logos/client-brand_Darden-Group.png' },
              { name: 'Chameleon Group', image: '/images/Clients-1767818842/current client logos/client-brand_Chameleon-Group.png' },
              { name: 'Horseshoe Bay Resort', image: '/images/Clients-1767818842/current client logos/client-brand-horseshoe-bay-resort.png' },
              { name: 'The Loren', image: '/images/Clients-1767818842/current client logos/client-brand-the-loren-hotel.png' },
              { name: 'Tarka', image: '/images/Clients-1767818842/current client logos/client-brand_Tarka.png' },
              { name: 'Wu Chow', image: '/images/Clients-1767818842/current client logos/client-brand_Wu-Chow.png' },
            ].map((client, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="flex items-center justify-center h-16 lg:h-20 w-full grayscale hover:grayscale-0 transition-all duration-300"
              >
                <Image
                  src={client.image}
                  alt={client.name}
                  width={180}
                  height={80}
                  className="object-contain max-h-full max-w-full w-auto"
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          ROI CALCULATOR SECTION
          ============================================ */}
      <section className="py-16 lg:py-20 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <ROICalculator />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          TESTIMONIALS SECTION
          ============================================ */}
      <section id="testimonials" className="py-16 lg:py-20 bg-cream-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-4 bg-plum-100 text-plum-700 border-plum-200">
                Testimonials
              </Badge>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-charcoal-900 leading-tight tracking-tight mb-4">
                Loved by hospitality professionals
              </h2>
              <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
                See what general managers, executive chefs, and operations directors have to say.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6 lg:gap-8"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="bg-white rounded-2xl p-8 border border-cream-200 shadow-card hover:shadow-elevated transition-shadow"
              >
                {/* Stars */}
                <div className="flex items-center gap-1 mb-6">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-honey-400 text-honey-400" />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-charcoal-700 leading-relaxed mb-8">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-plum-100 text-plum-700 font-semibold">
                      {testimonial.author.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-charcoal-900">{testimonial.author}</p>
                    <p className="text-sm text-charcoal-500">{testimonial.role}</p>
                    <p className="text-sm text-ocean-600">{testimonial.company}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          CTA SECTION
          ============================================ */}
      <section id="contact" className="relative py-16 lg:py-20 overflow-hidden bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1920&h=1080&fit=crop&q=80"
            alt="Boutique hotel"
            fill
            className="object-cover opacity-30"
            priority={false}
          />
        </div>
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal-900/85 via-charcoal-800/85 to-charcoal-900/85" />
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp}>
                <Badge variant="secondary" className="mb-6 bg-ocean-500/20 text-ocean-300 border-ocean-500/30">
                  Get Started Today
                </Badge>
              </motion.div>

              <motion.h2
                variants={fadeInUp}
                className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight tracking-tight mb-6"
              >
                Ready for pristine hospitality spaces?
              </motion.h2>

              <motion.p
                variants={fadeInUp}
                className="text-lg text-charcoal-300 leading-relaxed mb-8"
              >
                Get a free quote tailored to your property. Our team will conduct a walkthrough
                and provide a comprehensive cleaning plan within 24 hours.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
              >
                <a href="tel:+1-555-0123">
                  <Button
                    size="lg"
                    className="bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-xl hover:shadow-2xl transition-all"
                  >
                    Call (555) 012-3456
                  </Button>
                </a>
                <a href="mailto:info@urbansimple.com">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-plum-300/40 text-plum-200 hover:bg-plum-500/20 hover:border-plum-300/60"
                  >
                    Email Us
                  </Button>
                </a>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="flex flex-wrap items-center justify-center gap-6 pt-8 border-t border-white/10"
              >
                <div className="flex items-center gap-2 text-white/80">
                  <Check className="w-5 h-5 text-ocean-400" />
                  <span className="text-sm">Free consultation</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Check className="w-5 h-5 text-ocean-400" />
                  <span className="text-sm">Custom quotes</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Check className="w-5 h-5 text-ocean-400" />
                  <span className="text-sm">24-hour response</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================
          FOOTER
          ============================================ */}
      <footer className="bg-charcoal-950 text-white py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
            {/* Brand */}
            <div className="col-span-2">
              <Link href="/" className="flex items-baseline gap-1 mb-6">
                <span className="font-bold text-2xl tracking-tight text-white">
                  Urban
                </span>
                <span className="font-display italic font-normal text-2xl text-ocean-400">
                  Simple
                </span>
              </Link>
              <p className="text-charcoal-400 leading-relaxed max-w-xs mb-6">
                Premier commercial cleaning services for the hospitality industry.
                Trusted by hotels, restaurants, and resorts nationwide.
              </p>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-semibold text-white mb-4">Services</h4>
              <ul className="space-y-3">
                <li><a href="#services" className="text-charcoal-400 hover:text-white transition-colors">Hotels & Resorts</a></li>
                <li><a href="#services" className="text-charcoal-400 hover:text-white transition-colors">Restaurants & Bars</a></li>
                <li><a href="#services" className="text-charcoal-400 hover:text-white transition-colors">Commercial Kitchens</a></li>
                <li><a href="#services" className="text-charcoal-400 hover:text-white transition-colors">Green Cleaning</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-charcoal-400 hover:text-white transition-colors">About Us</a></li>
                <li><a href="#testimonials" className="text-charcoal-400 hover:text-white transition-colors">Testimonials</a></li>
                <li><a href="#contact" className="text-charcoal-400 hover:text-white transition-colors">Contact</a></li>
                <li><Link href="/login" className="text-charcoal-400 hover:text-white transition-colors">Client Portal</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-charcoal-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-charcoal-500 text-sm">
              &copy; {new Date().getFullYear()} Urban Simple. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="text-charcoal-400 hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-charcoal-400 hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      <FloatingQuoteCTA />
    </div>
  )
}
