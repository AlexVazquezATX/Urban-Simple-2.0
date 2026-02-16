'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  Palette,
  Layers,
  Sparkles,
  ImageIcon,
  Zap,
  Check,
  ArrowRight,
  Menu,
  X,
  Star,
  Upload,
  Wand2,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PLAN_PRICING } from '@/lib/config/studio-plans'
import { cn } from '@/lib/utils'

// ============================================
// ANIMATION VARIANTS
// ============================================

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

// ============================================
// CONTENT DATA
// ============================================

const HERO_PAIRS = [
  { before: '/images/landing/hero-before-1.jpg', after: '/images/landing/hero-after-1.jpg' },
  { before: '/images/landing/hero-before-2.jpg', after: '/images/landing/hero-after-2.jpg' },
  { before: '/images/landing/hero-before-3.jpg', after: '/images/landing/hero-after-3.jpg' },
]

const FEATURES = [
  {
    icon: Camera,
    title: 'AI Food Photography',
    description:
      'Upload your own photos or describe what you need — our AI turns them into stunning, professional shots. Choose from multiple styles — minimal, rustic, editorial, and more.',
  },
  {
    icon: Palette,
    title: 'Branded Social Posts',
    description:
      'Create Instagram-ready posts with your restaurant branding, colors, and logo. On-brand content in seconds.',
  },
  {
    icon: Layers,
    title: 'Multiple Output Formats',
    description:
      'Menu photos, Instagram squares, stories, and more. Every format your restaurant needs, ready to publish.',
  },
  {
    icon: Sparkles,
    title: 'Brand Kit',
    description:
      'Save your restaurant colors, fonts, and logo. Every piece of content stays consistently on-brand.',
  },
  {
    icon: ImageIcon,
    title: 'Gallery & History',
    description:
      'All your generated content in one place. Re-download, regenerate, or use as inspiration for new content.',
  },
  {
    icon: Zap,
    title: 'Smart Prompts',
    description:
      'Not sure what to create? Smart prompt suggestions tailored to your restaurant type and season.',
  },
]

const STEPS = [
  {
    number: '1',
    title: 'Upload',
    description:
      'Snap a photo with your phone and upload it — or describe what you want from scratch. Our AI works with your real content, not stock images.',
    icon: Upload,
    image: '/images/landing/step-describe.jpg',
  },
  {
    number: '2',
    title: 'Enhance',
    description:
      'Our AI transforms your photos into professional food photography in seconds. Pick a style, refine the setting, and add your branding.',
    icon: Wand2,
    image: '/images/landing/step-generate.jpg',
  },
  {
    number: '3',
    title: 'Publish',
    description:
      'Download your content and post directly to Instagram, update your menu, or add to your website.',
    icon: Download,
    image: '/images/landing/step-publish.jpg',
  },
]

const STATS = [
  { value: '1,000+', label: 'Images Generated' },
  { value: '50+', label: 'Restaurants' },
  { value: '4.9', label: 'Average Rating' },
]

// ============================================
// NAV
// ============================================

function BackHausNav() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-cream-50/80 backdrop-blur-xl border-b border-cream-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 shrink-0">
            <Image
              src="/images/backhaus-logos/backhaus-logo-compact.png"
              alt="BackHaus"
              width={140}
              height={28}
              className="h-5 w-auto opacity-70"
              priority
            />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mb-0.5" />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-charcoal-600 hover:text-charcoal-900 transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-charcoal-600 hover:text-charcoal-900 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-charcoal-600 hover:text-charcoal-900 transition-colors"
            >
              Pricing
            </a>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/studio/login"
              className="text-sm font-medium text-charcoal-600 hover:text-charcoal-900 transition-colors px-3 py-2"
            >
              Log In
            </Link>
            <Link href="/studio/signup">
              <Button className="bg-gradient-to-br from-honey-400 to-honey-500 text-charcoal-900 hover:from-honey-500 hover:to-honey-600 shadow-sm font-medium rounded-lg">
                Get Started Free
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-charcoal-600"
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-cream-50 border-t border-cream-200 px-4 py-4 space-y-3">
          <a
            href="#features"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-charcoal-700 py-2"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-charcoal-700 py-2"
          >
            How It Works
          </a>
          <a
            href="#pricing"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-charcoal-700 py-2"
          >
            Pricing
          </a>
          <div className="pt-2 border-t border-cream-200 flex flex-col gap-2">
            <Link
              href="/studio/login"
              className="text-sm font-medium text-charcoal-700 py-2"
            >
              Log In
            </Link>
            <Link href="/studio/signup">
              <Button className="w-full bg-gradient-to-br from-honey-400 to-honey-500 text-charcoal-900 hover:from-honey-500 hover:to-honey-600 font-medium rounded-lg">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

// ============================================
// HERO WITH CAROUSEL
// ============================================

function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const advance = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % HERO_PAIRS.length)
  }, [])

  useEffect(() => {
    if (paused) return
    const timer = setInterval(advance, 4500)
    return () => clearInterval(timer)
  }, [paused, advance])

  return (
    <section className="pt-28 pb-16 sm:pt-36 sm:pb-24 bg-cream-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <Badge className="mb-6 bg-honey-100 text-honey-700 border-honey-200">
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                AI-Powered Food Photography
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-charcoal-900 leading-[1.1] tracking-tight mb-6"
            >
              Restaurant content that{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-honey-500 to-bronze-500">
                looks professional
              </span>
              , created in seconds
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-charcoal-600 leading-relaxed mb-8 max-w-xl"
            >
              Turn your phone photos into professional food photography, branded
              social posts, and marketing content. No photographer needed.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-start gap-4"
            >
              <Link href="/studio/signup">
                <Button
                  size="lg"
                  className="bg-gradient-to-br from-honey-400 to-honey-500 text-charcoal-900 hover:from-honey-500 hover:to-honey-600 shadow-lg font-medium rounded-lg text-base px-8"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-charcoal-300 text-charcoal-700 hover:bg-charcoal-50 rounded-lg text-base"
                >
                  See How It Works
                </Button>
              </a>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-8 text-sm text-charcoal-500"
            >
              {['Free tier available', 'No credit card required', 'Cancel anytime'].map(
                (text) => (
                  <span key={text} className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-honey-500" />
                    {text}
                  </span>
                )
              )}
            </motion.div>
          </motion.div>

          {/* Right column — Before/After carousel */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="rounded-2xl shadow-xl overflow-hidden border border-cream-200 bg-white">
              <div className="grid grid-cols-2 relative">
                {/* Before */}
                <div className="aspect-square relative overflow-hidden bg-charcoal-100">
                  <div className="absolute top-3 left-3 z-10">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded">
                      Before
                    </span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={`before-${activeIndex}`}
                      src={HERO_PAIRS[activeIndex].before}
                      alt="Phone photo"
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                  </AnimatePresence>
                </div>

                {/* After */}
                <div className="aspect-square relative overflow-hidden bg-honey-50">
                  <div className="absolute top-3 right-3 z-10">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-honey-900 bg-honey-300/70 backdrop-blur-sm px-2 py-0.5 rounded">
                      After
                    </span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={`after-${activeIndex}`}
                      src={HERO_PAIRS[activeIndex].after}
                      alt="AI-enhanced"
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                  </AnimatePresence>
                </div>

                {/* Center divider */}
                <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white -translate-x-1/2 z-10" />
              </div>

              {/* Dot indicators */}
              <div className="flex items-center justify-center gap-2 py-3 bg-white">
                {HERO_PAIRS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all duration-300',
                      i === activeIndex
                        ? 'bg-honey-500 w-6'
                        : 'bg-charcoal-200 hover:bg-charcoal-300'
                    )}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ============================================
// SOCIAL PROOF BAR
// ============================================

function SocialProofBar() {
  return (
    <section className="bg-charcoal-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="text-center"
        >
          <motion.p
            variants={fadeInUp}
            className="text-sm text-charcoal-400 mb-6 uppercase tracking-wider"
          >
            Trusted by restaurants everywhere
          </motion.p>
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            {STATS.map((stat) => (
              <motion.div key={stat.label} variants={fadeInUp}>
                <p className="text-3xl sm:text-4xl font-display font-semibold text-white mb-1">
                  {stat.value}
                </p>
                <p className="text-xs sm:text-sm text-charcoal-400">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ============================================
// FEATURES GRID
// ============================================

function FeaturesGrid() {
  return (
    <section id="features" className="py-20 bg-white scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="text-center mb-12"
        >
          <motion.div variants={fadeInUp}>
            <Badge className="mb-4 bg-honey-100 text-honey-700 border-honey-200">
              Features
            </Badge>
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="font-display text-3xl sm:text-4xl font-semibold text-charcoal-900 tracking-tight mb-4"
          >
            Everything your restaurant needs
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-lg text-charcoal-600 max-w-2xl mx-auto"
          >
            From food photography to branded social content, all powered by AI.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {FEATURES.map((feature) => (
            <motion.div key={feature.title} variants={fadeInUp}>
              <div className="h-full p-8 rounded-2xl border border-cream-200 bg-gradient-to-b from-cream-50 to-white hover:shadow-lg transition-all duration-300 hover:border-honey-200">
                <div className="w-12 h-12 rounded-xl bg-honey-100 flex items-center justify-center mb-5">
                  <feature.icon className="w-6 h-6 text-honey-600" />
                </div>
                <h3 className="font-display text-lg font-medium text-charcoal-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-charcoal-600 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ============================================
// HOW IT WORKS
// ============================================

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-cream-50 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div variants={fadeInUp}>
            <Badge className="mb-4 bg-honey-100 text-honey-700 border-honey-200">
              How It Works
            </Badge>
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="font-display text-3xl sm:text-4xl font-semibold text-charcoal-900 tracking-tight mb-4"
          >
            Three steps to restaurant content
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-lg text-charcoal-600 max-w-2xl mx-auto"
          >
            Professional food photography and branded posts in under a minute.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8 lg:gap-12 relative"
        >
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-0.5 border-t-2 border-dashed border-honey-300" />

          {STEPS.map((step) => (
            <motion.div
              key={step.number}
              variants={fadeInUp}
              className="text-center relative"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-honey-400 to-honey-500 flex items-center justify-center mx-auto mb-6 shadow-lg relative z-10">
                <span className="text-2xl font-display font-bold text-charcoal-900">
                  {step.number}
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-cream-200 p-6">
                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden mb-5">
                  <img
                    src={step.image}
                    alt={step.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-display text-xl font-medium text-charcoal-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-charcoal-600 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ============================================
// BEFORE / AFTER SHOWCASE
// ============================================

function BeforeAfterShowcase() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="text-center mb-12"
        >
          <motion.h2
            variants={fadeInUp}
            className="font-display text-3xl sm:text-4xl font-semibold text-charcoal-900 tracking-tight mb-4"
          >
            Stop settling for stock photos
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-lg text-charcoal-600 max-w-2xl mx-auto"
          >
            Your restaurant is unique. Your content should be too.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 gap-8"
        >
          {/* Before */}
          <motion.div variants={fadeInUp}>
            <div className="rounded-2xl border-2 border-dashed border-charcoal-200 bg-charcoal-50 p-8 h-full">
              <div className="aspect-[4/3] rounded-xl overflow-hidden mb-6">
                <img
                  src="/images/landing/showcase-before.jpg"
                  alt="Phone food photo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-display text-lg font-medium text-charcoal-700 mb-2">
                Without BackHaus
              </h3>
              <ul className="space-y-2 text-sm text-charcoal-500">
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  Spending $500+ per photo shoot
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  Using the same stock photos as competitors
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  Inconsistent branding across platforms
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  Weeks of turnaround time
                </li>
              </ul>
            </div>
          </motion.div>

          {/* After */}
          <motion.div variants={fadeInUp}>
            <div className="rounded-2xl border border-honey-200 bg-gradient-to-br from-honey-50 to-bronze-50 p-8 shadow-lg h-full">
              <div className="aspect-[4/3] rounded-xl overflow-hidden mb-6 border border-honey-200">
                <img
                  src="/images/landing/showcase-after.jpg"
                  alt="AI-generated food photo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-display text-lg font-medium text-charcoal-900 mb-2">
                With BackHaus
              </h3>
              <ul className="space-y-2 text-sm text-charcoal-700">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-honey-600 shrink-0 mt-0.5" />
                  Unlimited content from $29/month
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-honey-600 shrink-0 mt-0.5" />
                  Unique AI-generated images for your restaurant
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-honey-600 shrink-0 mt-0.5" />
                  Consistent on-brand content every time
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-honey-600 shrink-0 mt-0.5" />
                  Ready in seconds, not weeks
                </li>
              </ul>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// ============================================
// PRICING
// ============================================

function PricingSection() {
  return (
    <section id="pricing" className="py-20 bg-cream-50 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="text-center mb-12"
        >
          <motion.div variants={fadeInUp}>
            <Badge className="mb-4 bg-honey-100 text-honey-700 border-honey-200">
              Pricing
            </Badge>
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="font-display text-3xl sm:text-4xl font-semibold text-charcoal-900 tracking-tight mb-4"
          >
            Simple, transparent pricing
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-lg text-charcoal-600 max-w-2xl mx-auto"
          >
            Start free. Upgrade when you need more.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {PLAN_PRICING.map((plan) => (
            <motion.div key={plan.tier} variants={fadeInUp}>
              <div
                className={cn(
                  'rounded-2xl border p-7 flex flex-col h-full relative',
                  plan.highlighted
                    ? 'border-honey-500 bg-white shadow-lg ring-1 ring-honey-500'
                    : 'border-cream-200 bg-white shadow-sm hover:shadow-md transition-shadow'
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-honey-500 text-charcoal-900 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="font-display text-lg font-medium text-charcoal-900 mb-1">
                    {plan.displayName}
                  </h3>
                  <p className="text-sm text-charcoal-500">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-display font-bold text-charcoal-900">
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-charcoal-500 text-sm">/month</span>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-charcoal-700"
                    >
                      <Check
                        className={cn(
                          'w-4 h-4 shrink-0 mt-0.5',
                          plan.highlighted
                            ? 'text-honey-600'
                            : 'text-charcoal-400'
                        )}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={
                    plan.tier === 'TRIAL'
                      ? '/studio/signup'
                      : `/studio/signup?plan=${plan.tier}`
                  }
                >
                  <Button
                    className={cn(
                      'w-full rounded-lg font-medium',
                      plan.highlighted
                        ? 'bg-gradient-to-br from-honey-400 to-honey-500 text-charcoal-900 hover:from-honey-500 hover:to-honey-600 shadow-sm'
                        : 'bg-charcoal-900 text-white hover:bg-charcoal-800'
                    )}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <p className="text-center text-sm text-charcoal-500 mt-8">
          All plans include a 30-day money-back guarantee. Cancel anytime.
        </p>
      </div>
    </section>
  )
}

// ============================================
// FINAL CTA
// ============================================

function FinalCTA() {
  return (
    <section className="bg-charcoal-900 py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
        >
          <motion.h2
            variants={fadeInUp}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight tracking-tight mb-6"
          >
            Start creating restaurant content today
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="text-lg text-charcoal-400 leading-relaxed mb-8"
          >
            Join restaurants using AI to create professional food photography and
            branded content. Free to start — no credit card required.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          >
            <Link href="/studio/signup">
              <Button
                size="lg"
                className="bg-gradient-to-br from-honey-400 to-honey-500 text-charcoal-900 hover:from-honey-500 hover:to-honey-600 shadow-lg font-medium rounded-lg text-base px-8"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="#pricing">
              <Button
                variant="outline"
                size="lg"
                className="border-charcoal-600 text-charcoal-300 hover:bg-charcoal-800 hover:text-white rounded-lg text-base"
              >
                View Pricing
              </Button>
            </a>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="flex flex-wrap items-center justify-center gap-6 pt-8 border-t border-white/10 text-sm text-charcoal-400"
          >
            {['Free tier available', 'No credit card required', 'Cancel anytime'].map(
              (text) => (
                <span key={text} className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-honey-500" />
                  {text}
                </span>
              )
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// ============================================
// FOOTER
// ============================================

function BackHausFooter() {
  return (
    <footer className="bg-charcoal-950 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-1 mb-3">
              <Image
                src="/images/backhaus-logos/backhaus-logo-yellow.png"
                alt="BackHaus"
                width={120}
                height={24}
                className="h-5 w-auto"
              />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mb-0.5" />
            </div>
            <p className="text-sm text-charcoal-400 leading-relaxed">
              AI-powered food photography and branded content for restaurants.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Product</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#features"
                  className="text-sm text-charcoal-400 hover:text-white transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="text-sm text-charcoal-400 hover:text-white transition-colors"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="text-sm text-charcoal-400 hover:text-white transition-colors"
                >
                  How It Works
                </a>
              </li>
            </ul>
          </div>

          {/* Account links */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Account</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/studio/login"
                  className="text-sm text-charcoal-400 hover:text-white transition-colors"
                >
                  Log In
                </Link>
              </li>
              <li>
                <Link
                  href="/studio/signup"
                  className="text-sm text-charcoal-400 hover:text-white transition-colors"
                >
                  Sign Up
                </Link>
              </li>
              <li>
                <Link
                  href="/studio"
                  className="text-sm text-charcoal-400 hover:text-white transition-colors"
                >
                  Studio Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/studio/privacy"
                  className="text-sm text-charcoal-400 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/studio/terms"
                  className="text-sm text-charcoal-400 hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-charcoal-800 pt-6 text-center">
          <p className="text-xs text-charcoal-500">
            &copy; {new Date().getFullYear()} BackHaus. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

// ============================================
// PAGE
// ============================================

export default function BackHausLandingPage() {
  return (
    <div className="min-h-screen bg-cream-50 scroll-smooth">
      <BackHausNav />
      <HeroSection />
      <SocialProofBar />
      <FeaturesGrid />
      <HowItWorks />
      <BeforeAfterShowcase />
      <PricingSection />
      <FinalCTA />
      <BackHausFooter />
    </div>
  )
}
