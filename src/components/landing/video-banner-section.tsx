'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Play, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWalkthrough } from './walkthrough-context'

export function VideoBannerSection() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const { open: openWalkthrough } = useWalkthrough()

  return (
    <section ref={ref} className="relative h-[500px] lg:h-[600px] overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source
          src="/images/Headers-1767818867/Urban-Simple-Office-Team-2025.mp4"
          type="video/mp4"
        />
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/85 via-charcoal-900/70 to-charcoal-900/85" />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 via-transparent to-charcoal-900/40" />

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="max-w-2xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-white/70 text-sm font-medium uppercase tracking-wider">
              See Our Teams in Action
            </span>
          </div>

          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-[1.1] tracking-tight mb-6">
            Your kitchen.{' '}
            <span className="text-ocean-400">Our obsession.</span>
          </h2>

          <p className="text-lg lg:text-xl text-white/80 mb-8 max-w-lg leading-relaxed">
            Every night, our teams transform commercial kitchens across Texas —
            leaving them cleaner, safer, and ready for tomorrow.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button
              onClick={openWalkthrough}
              size="lg"
              className="bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-lg hover:shadow-xl text-base px-8"
            >
              Schedule a Walkthrough
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
