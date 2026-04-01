'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'framer-motion'
import { PublicNav } from '@/components/landing/public-nav'
import {
  Sparkles,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ROICalculator } from '@/components/landing/roi-calculator'
import { FloatingQuoteCTA } from '@/components/landing/floating-quote-cta'
import { WhyUsSection } from '@/components/landing/why-us-section'
import { SocialProofSection } from '@/components/landing/social-proof-section'
import { VideoBannerSection } from '@/components/landing/video-banner-section'
import { BlogFilmstripSection } from '@/components/landing/blog-filmstrip-section'
import { FAQSection } from '@/components/landing/faq-section'
import { InlineContactForm } from '@/components/landing/inline-contact-form'
import { FooterSection } from '@/components/landing/footer-section'
import { BeforeAfterSection } from '@/components/landing/before-after-section'
import { Spotlight } from '@/components/landing/spotlight'
import { IndustryDetailModal, INDUSTRY_DETAILS } from '@/components/landing/industry-detail-modal'
import { useWalkthrough } from '@/components/landing/walkthrough-context'
import { cn } from '@/lib/utils'
import { testimonials, CONTACT } from '@/components/landing/landing-data'
import { fadeInUp, fadeInRight, scaleIn, staggerContainer } from '@/components/landing/landing-animations'

// ============================================
// CONTENT DATA (kept inline for JSX icons)
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
    color: 'plum',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Quality Reporting',
    description: 'Digital checklists, photo documentation, and detailed reports after every service.',
    color: 'bronze',
  },
]

// ============================================
// QUOTE BUTTON (uses walkthrough context)
// ============================================

function QuoteButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { open } = useWalkthrough()
  return (
    <Button onClick={open} size="lg" className={className}>
      {children}
    </Button>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

// Split text animation: each word fades up with stagger
const headlineWords = "Texas' most trusted hospitality cleaning partner".split(' ')

export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroImageY = useTransform(scrollYProgress, [0, 1], [0, -150])
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null)
  const [activeService, setActiveService] = useState(0)

  return (
    <div className="min-h-screen bg-cream-50">
      <PublicNav />

      {/* ============================================
          HERO SECTION — Full-bleed team photo
          ============================================ */}
      <section ref={heroRef} className="relative min-h-[85vh] flex items-end overflow-hidden">
        {/* Full-bleed Background Image with Parallax */}
        <motion.div className="absolute inset-0" style={{ y: heroImageY }}>
          <Image
            src="/images/Headers-1767818867/Urban-Simple-Team-in-Front-of-HQ-Viviana-Replacement.jpg"
            alt="Urban Simple team in front of headquarters"
            fill
            className="object-cover scale-110"
            priority
          />
        </motion.div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/90 via-charcoal-900/40 to-charcoal-900/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/60 via-transparent to-transparent" />

        {/* Animated gradient blobs */}
        <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[900px] h-[900px] bg-gradient-to-br from-ocean-500/50 via-plum-500/30 to-transparent rounded-full blur-3xl animate-blob" />
          <div className="absolute -bottom-32 -left-32 w-[700px] h-[700px] bg-gradient-to-tr from-bronze-500/40 via-ocean-400/20 to-transparent rounded-full blur-3xl animate-blob-reverse" />
        </div>

        {/* Content — positioned at bottom */}
        <div className="relative w-full pt-32 pb-16 lg:pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="max-w-3xl"
            >
              <motion.div variants={fadeInUp}>
                <Badge variant="secondary" className="mb-6 bg-white/15 text-white border-white/20 backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 mr-1" />
                  Austin&rsquo;s Choice for Hospitality Cleaning
                </Badge>
              </motion.div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold text-cream-100 leading-[1.1] tracking-tight mb-6">
                {headlineWords.map((word, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
                    className="inline-block mr-[0.3em]"
                  >
                    {word}
                  </motion.span>
                ))}
              </h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg sm:text-xl text-white/80 leading-relaxed mb-8 max-w-2xl"
              >
                Specialized commercial kitchen cleaning for hotels, resorts, restaurants, and event venues.
                Plus dining rooms, bathrooms, lobbies, and common areas. Proudly serving Texas hospitality for over 15 years.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                className="flex flex-col sm:flex-row items-start gap-4"
              >
                <QuoteButton className="bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-lg hover:shadow-xl transition-all">
                  Get a Free Quote
                  <ArrowRight className="w-5 h-5 ml-2" />
                </QuoteButton>
                <a href="#services">
                  <Button variant="outline" size="lg" className="bg-white/10 border-cream-200/40 text-cream-100 hover:bg-white/20 hover:border-cream-200/60 backdrop-blur-sm">
                    View Services
                  </Button>
                </a>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                variants={fadeInUp}
                className="mt-10 pt-6 border-t border-white/15"
              >
                <div className="flex flex-col sm:flex-row items-start gap-6 text-sm text-white/70">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-ocean-400" />
                    <span>Certified & Insured</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-ocean-400" />
                    <span>24/7 Service Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-ocean-400" />
                    <span>Eco-Friendly Products</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================
          WHY US SECTION
          ============================================ */}
      <WhyUsSection />

      {/* ============================================
          BEFORE / AFTER SLIDER
          ============================================ */}
      <BeforeAfterSection />

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
            <motion.div variants={fadeInRight}>
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
            {[
              { icon: <Hotel className="w-6 h-6 text-white" />, title: 'Hotels & Resorts', desc: 'Kitchen facilities, dining rooms, bathrooms, lobbies, and common areas.', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop&q=80', color: 'ocean' },
              { icon: <UtensilsCrossed className="w-6 h-6 text-white" />, title: 'Restaurants & Bars', desc: 'Kitchen cleaning, dining areas, bars, and front-of-house spaces that impress guests.', img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop&q=80', color: 'bronze' },
              { icon: <ChefHat className="w-6 h-6 text-white" />, title: 'Commercial Kitchens', desc: 'Deep cleaning, degreasing, and health code compliance for food service environments.', img: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&h=600&fit=crop&q=80', color: 'terracotta' },
              { icon: <Calendar className="w-6 h-6 text-white" />, title: 'Event Venues', desc: 'Banquet halls, ballrooms, and event spaces. Carpet cleaning and pressure washing services.', img: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&h=600&fit=crop&q=80', color: 'plum' },
              { icon: <Droplets className="w-6 h-6 text-white" />, title: 'Spas & Wellness', desc: 'Kitchen facilities, treatment rooms, relaxation areas, and wellness facilities kept pristine.', img: '/images/Services-1767818882/service_Hotels-Hospitality-01.jpg', color: 'sage' },
              { icon: <Home className="w-6 h-6 text-white" />, title: 'Boutique Hotels', desc: 'Kitchen facilities, dining rooms, bathrooms, and common areas for intimate properties.', img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop&q=80', color: 'honey' },
            ].map((industry, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group cursor-pointer"
                onClick={() => setSelectedIndustry(INDUSTRY_DETAILS[index].slug)}
              >
                <div className="relative rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300">
                  <div className="aspect-[4/3] relative">
                    <Image
                      src={industry.img}
                      alt={industry.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/95 via-charcoal-900/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 pb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn(
                        'w-12 h-12 rounded-xl backdrop-blur-sm flex items-center justify-center',
                        industry.color === 'ocean' && 'bg-ocean-500/90',
                        industry.color === 'bronze' && 'bg-bronze-500/90',
                        industry.color === 'terracotta' && 'bg-terracotta-500/90',
                        industry.color === 'plum' && 'bg-plum-500/90',
                        industry.color === 'sage' && 'bg-sage-500/90',
                        industry.color === 'honey' && 'bg-honey-500/90',
                      )}>
                        {industry.icon}
                      </div>
                      <h3 className="text-2xl font-semibold text-white">{industry.title}</h3>
                    </div>
                    <p className="text-white/90 leading-relaxed">{industry.desc}</p>
                    <div className="flex items-center gap-1 mt-3 text-sm font-medium text-white/60 group-hover:text-white transition-colors">
                      <span>Learn more</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          SERVICES SECTION — Interactive Expanding Panels
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
            <motion.div variants={scaleIn}>
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

          {/* Desktop: Expanding panels */}
          <div className="hidden lg:flex gap-3 h-[260px]">
            {features.map((feature, index) => {
              const isActive = activeService === index
              const colorMap: Record<string, { bg: string; bgLight: string; border: string; borderLight: string; icon: string; iconLight: string; text: string }> = {
                ocean: { bg: 'bg-ocean-600', bgLight: 'bg-ocean-50', border: 'border-ocean-500', borderLight: 'border-ocean-200', icon: 'text-ocean-200', iconLight: 'text-ocean-600', text: 'text-ocean-100' },
                bronze: { bg: 'bg-bronze-600', bgLight: 'bg-bronze-50', border: 'border-bronze-500', borderLight: 'border-bronze-200', icon: 'text-bronze-200', iconLight: 'text-bronze-600', text: 'text-bronze-100' },
                terracotta: { bg: 'bg-terracotta-600', bgLight: 'bg-terracotta-50', border: 'border-terracotta-500', borderLight: 'border-terracotta-200', icon: 'text-terracotta-200', iconLight: 'text-terracotta-600', text: 'text-terracotta-100' },
                plum: { bg: 'bg-plum-600', bgLight: 'bg-plum-50', border: 'border-plum-500', borderLight: 'border-plum-200', icon: 'text-plum-200', iconLight: 'text-plum-600', text: 'text-plum-100' },
              }
              const colors = colorMap[feature.color] || colorMap.ocean
              return (
                <motion.div
                  key={index}
                  animate={{ flex: isActive ? 4 : 1 }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                  onClick={() => setActiveService(index)}
                  className={cn(
                    'relative rounded-2xl overflow-hidden cursor-pointer border transition-colors duration-300',
                    isActive ? `${colors.bg} ${colors.border}` : `${colors.bgLight} ${colors.borderLight} hover:shadow-card`
                  )}
                >
                  <div className="h-full flex flex-col justify-between p-5">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      isActive ? 'bg-white/20' : `${colors.bgLight}`
                    )}>
                      <div className={isActive ? colors.icon : colors.iconLight}>
                        {feature.icon}
                      </div>
                    </div>
                    {isActive ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-auto"
                      >
                        <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                        <p className={cn('text-sm leading-relaxed', colors.text)}>{feature.description}</p>
                      </motion.div>
                    ) : (
                      <div className="mt-auto">
                        <h3 className="text-sm font-semibold text-charcoal-800">{feature.title}</h3>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Mobile: Colored cards */}
          <div className="grid grid-cols-2 gap-4 lg:hidden">
            {features.map((feature, index) => {
              const colorMap: Record<string, string> = {
                ocean: 'bg-ocean-50 border-ocean-200',
                bronze: 'bg-bronze-50 border-bronze-200',
                terracotta: 'bg-terracotta-50 border-terracotta-200',
                plum: 'bg-plum-50 border-plum-200',
              }
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={cn('p-5 rounded-xl border', colorMap[feature.color] || 'bg-cream-50 border-cream-200')}
                >
                  <div className="mb-3">{feature.icon}</div>
                  <h3 className="text-sm font-semibold text-charcoal-900 mb-1">{feature.title}</h3>
                  <p className="text-xs text-charcoal-600 leading-relaxed">{feature.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============================================
          SOCIAL PROOF — Clients + Awards
          ============================================ */}
      <SocialProofSection />

      {/* ============================================
          ROI CALCULATOR SECTION
          ============================================ */}
      <section className="py-16 lg:py-20 bg-white">
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
          TESTIMONIALS SECTION — Dark Cards
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
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
          >
            {testimonials.map((testimonial, index) => {
              const accentColors = ['border-t-ocean-500', 'border-t-bronze-500', 'border-t-plum-500', 'border-t-terracotta-500']
              const quoteColors = ['text-ocean-500/20', 'text-bronze-500/20', 'text-plum-500/20', 'text-terracotta-500/20']
              return (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className={cn(
                    'relative bg-charcoal-900 rounded-2xl p-6 border border-charcoal-800 border-t-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden',
                    accentColors[index % accentColors.length]
                  )}
                >
                  {/* Decorative quote mark */}
                  <span className={cn('absolute top-3 right-4 font-display text-6xl leading-none select-none pointer-events-none', quoteColors[index % quoteColors.length])}>
                    &ldquo;
                  </span>
                  <div className="relative">
                    <div className="flex items-center gap-0.5 mb-4">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-honey-400 text-honey-400" />
                      ))}
                    </div>
                    <blockquote className="text-charcoal-200 text-sm leading-relaxed mb-6">
                      &ldquo;{testimonial.quote}&rdquo;
                    </blockquote>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-charcoal-700 text-white font-semibold text-xs">
                          {testimonial.author.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-white text-sm">{testimonial.author}</p>
                        <p className="text-xs text-charcoal-400">{testimonial.role}</p>
                        <p className="text-xs text-ocean-400">{testimonial.company}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          VIDEO BANNER — Full-bleed commercial loop
          ============================================ */}
      <VideoBannerSection />

      {/* ============================================
          BLOG FILMSTRIP (NEW)
          ============================================ */}
      <BlogFilmstripSection />

      {/* ============================================
          FAQ SECTION (NEW)
          ============================================ */}
      <FAQSection />

      {/* ============================================
          CTA SECTION WITH INLINE FORM
          ============================================ */}
      <Spotlight className="relative py-16 lg:py-20 overflow-hidden bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900" id="contact">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1920&h=1080&fit=crop&q=80"
            alt="Boutique hotel"
            fill
            className="object-cover opacity-30"
            priority={false}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal-900/85 via-charcoal-800/85 to-charcoal-900/85" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left: Text + Quick Actions */}
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
                className="flex flex-col sm:flex-row items-start gap-4 mb-8"
              >
                <a href={CONTACT.phoneHref}>
                  <Button
                    size="lg"
                    className="bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-xl hover:shadow-2xl transition-all"
                  >
                    Call {CONTACT.phone}
                  </Button>
                </a>
                <a href={CONTACT.emailHref}>
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
                className="flex flex-wrap items-center gap-6 pt-8 border-t border-white/10"
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

            {/* Right: Inline Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8"
            >
              <h3 className="text-xl font-semibold text-white mb-2">Send us a message</h3>
              <p className="text-charcoal-400 text-sm mb-6">Fill out the form and we&rsquo;ll get back to you within 24 hours.</p>
              <InlineContactForm />
            </motion.div>
          </div>
        </div>
      </Spotlight>

      {/* ============================================
          FOOTER
          ============================================ */}
      <FooterSection />

      <IndustryDetailModal
        industry={selectedIndustry ? INDUSTRY_DETAILS.find(i => i.slug === selectedIndustry) ?? null : null}
        onClose={() => setSelectedIndustry(null)}
      />

      <FloatingQuoteCTA />
    </div>
  )
}
