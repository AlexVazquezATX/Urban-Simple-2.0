'use client'

import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
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

export function WhyUsSection() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

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

        {/* Split Layout: Photo + Value Props */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Photo Side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-lifted">
              <div className="aspect-[3/4] relative">
                <Image
                  src="/images/Headers-1767818867/Urban-Simple-Team-Conference.jpg"
                  alt="Urban Simple team meeting"
                  fill
                  className="object-cover"
                />
              </div>
              {/* Overlay with stat */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-charcoal-900/90 via-charcoal-900/50 to-transparent">
                <p className="text-white/90 text-sm font-medium mb-1">3x Inc. 5000 Honoree</p>
                <p className="text-white font-display text-3xl font-semibold">Fastest-Growing Companies</p>
                <p className="text-white/70 text-sm mt-1">2020, 2022 & 2024</p>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 lg:-right-6 bg-white rounded-2xl shadow-elevated p-4 border border-cream-200">
              <div className="text-center">
                <p className="font-display text-2xl font-semibold text-ocean-600">15+</p>
                <p className="text-xs text-charcoal-500 font-medium">Years in<br />Business</p>
              </div>
            </div>
          </motion.div>

          {/* Value Props Side */}
          <motion.div
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={staggerContainer}
            className="lg:col-span-7 space-y-8"
          >
            {valueProps.map((prop, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="flex gap-5 items-start group"
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
                <div>
                  <h3 className="text-xl font-semibold text-charcoal-900 mb-2">
                    {prop.title}
                  </h3>
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
