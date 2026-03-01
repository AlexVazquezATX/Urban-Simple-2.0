'use client'

import Image from 'next/image'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { Settings2, Leaf, ClipboardCheck, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { valueProps } from './landing-data'
import { fadeInUp, staggerContainer } from './landing-animations'

const icons = [
  <Settings2 key="settings" className="w-6 h-6" />,
  <Leaf key="leaf" className="w-6 h-6" />,
  <ClipboardCheck key="clipboard" className="w-6 h-6" />,
  <TrendingUp key="trending" className="w-6 h-6" />,
]

// Photos for the rotating stack
const STACK_PHOTOS = [
  {
    src: '/images/Headers-1767818867/Urban-Simple-Team-Conference.jpg',
    alt: 'Urban Simple team in a planning meeting',
  },
  {
    src: '/images/Team-1767818889/team_Urban-Simple-Group-01.jpg',
    alt: 'Urban Simple cleaning crew on site',
  },
  {
    src: '/images/Headers-1767818867/Urban-Simple-Van.jpg',
    alt: 'Urban Simple service vehicle',
  },
]

export function WhyUsSection() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [activePhoto, setActivePhoto] = useState(0)

  // Auto-rotate photos every 4 seconds
  useEffect(() => {
    if (!isInView) return
    const interval = setInterval(() => {
      setActivePhoto((prev) => (prev + 1) % STACK_PHOTOS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [isInView])

  return (
    <section id="why-us" ref={ref} className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div variants={fadeInUp}>
            <Badge variant="secondary" className="mb-4 bg-ocean-100 text-ocean-700 border-ocean-200">
              Why Urban Simple
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-charcoal-900 leading-tight tracking-tight mb-4">
              We handle the cleaning so you can{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-bronze-500 to-bronze-600">
                scale your business
              </span>
            </h2>
            <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
              Hospitality leaders choose Urban Simple for our commitment to quality, consistency, and partnership.
            </p>
          </motion.div>
        </motion.div>

        {/* Split Layout: Photo Stack + Value Props */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Photo Stack Side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative">
              {/* Photo container with rounded corners */}
              <div className="relative rounded-3xl overflow-hidden shadow-lifted aspect-[3/4]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePhoto}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={STACK_PHOTOS[activePhoto].src}
                      alt={STACK_PHOTOS[activePhoto].alt}
                      fill
                      className="object-cover"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Overlay with stat */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-charcoal-900/90 via-charcoal-900/50 to-transparent z-10">
                  <p className="text-white/90 text-sm font-medium mb-1">3x Inc. 5000 Honoree</p>
                  <p className="text-white font-display text-3xl font-semibold">Fastest-Growing Companies</p>
                  <p className="text-white/70 text-sm mt-1">2020, 2022 & 2024</p>
                </div>
              </div>

              {/* Photo indicators */}
              <div className="flex justify-center gap-2 mt-4">
                {STACK_PHOTOS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhoto(i)}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      i === activePhoto
                        ? 'w-8 bg-ocean-500'
                        : 'w-4 bg-charcoal-200 hover:bg-charcoal-300'
                    )}
                    aria-label={`View photo ${i + 1}`}
                  />
                ))}
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 lg:-right-6 bg-white rounded-2xl shadow-elevated p-4 border border-cream-200 z-20">
                <div className="text-center">
                  <p className="font-display text-2xl font-semibold text-ocean-600">15+</p>
                  <p className="text-xs text-charcoal-500 font-medium">Years in<br />Business</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Value Props Side */}
          <motion.div
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={staggerContainer}
            className="lg:col-span-7 space-y-6"
          >
            {valueProps.map((prop, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="flex gap-5 items-start group p-4 -mx-4 rounded-2xl hover:bg-cream-50/80 transition-colors"
              >
                <div className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110',
                  prop.color === 'ocean' && 'bg-ocean-100 text-ocean-600',
                  prop.color === 'sage' && 'bg-sage-100 text-sage-600',
                  prop.color === 'bronze' && 'bg-bronze-100 text-bronze-600',
                  prop.color === 'terracotta' && 'bg-terracotta-100 text-terracotta-600',
                )}>
                  {icons[i]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-xl font-semibold text-charcoal-900">
                      {prop.title}
                    </h3>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full',
                      prop.color === 'ocean' && 'bg-ocean-100 text-ocean-700',
                      prop.color === 'sage' && 'bg-sage-100 text-sage-700',
                      prop.color === 'bronze' && 'bg-bronze-100 text-bronze-700',
                      prop.color === 'terracotta' && 'bg-terracotta-100 text-terracotta-700',
                    )}>
                      <span className="font-bold">{prop.metric}</span>
                      <span className="font-normal opacity-80">{prop.metricLabel}</span>
                    </span>
                  </div>
                  <p className="text-charcoal-600 leading-relaxed">
                    {prop.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
