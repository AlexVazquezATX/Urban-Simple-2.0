'use client'

import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { certifications } from './landing-data'
import { fadeInUp } from './landing-animations'

export function CertificationsSection() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section ref={ref} className="py-16 lg:py-20 bg-cream-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <Badge variant="secondary" className="mb-4 bg-honey-100 text-honey-700 border-honey-200">
            Recognition
          </Badge>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-charcoal-900 leading-tight tracking-tight mb-4">
            Awards & Certifications
          </h2>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            Recognized for excellence, growth, and commitment to our community.
          </p>
        </motion.div>
      </div>

      {/* Marquee */}
      <div className="group relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-cream-50 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-cream-50 to-transparent z-10 pointer-events-none" />

        <div className="flex gap-12 animate-marquee group-hover:[animation-play-state:paused] py-4">
          {[...certifications, ...certifications].map((cert, i) => (
            <div
              key={i}
              className="flex-shrink-0 flex items-center justify-center h-20 min-w-[160px] grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            >
              {cert.image ? (
                <Image
                  src={cert.image}
                  alt={cert.name}
                  width={160}
                  height={80}
                  className="object-contain max-h-full"
                />
              ) : (
                <div className="px-5 py-3 border-2 border-charcoal-300 rounded-xl text-charcoal-600 font-semibold text-sm whitespace-nowrap hover:border-ocean-400 hover:text-ocean-700 transition-colors">
                  {cert.name}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
