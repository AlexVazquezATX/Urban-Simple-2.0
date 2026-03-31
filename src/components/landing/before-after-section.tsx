'use client'

import { useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { fadeInUp } from './landing-animations'

const BEFORE_IMAGE = '/images/Services-1767818882/Kitchen 01 - Dirty.jpg'
const AFTER_IMAGE = '/images/Services-1767818882/Kitchen 01 - Clean.png'

export function BeforeAfterSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
  const containerRef = useRef<HTMLDivElement>(null)
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percent = Math.max(5, Math.min(95, (x / rect.width) * 100))
    setSliderPosition(percent)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    updatePosition(e.clientX)
  }, [updatePosition])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    updatePosition(e.clientX)
  }, [isDragging, updatePosition])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  return (
    <section ref={sectionRef} className="py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <Badge variant="secondary" className="mb-4 bg-terracotta-100 text-terracotta-700 border-terracotta-200">
            See the Difference
          </Badge>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-charcoal-900 leading-tight tracking-tight mb-4">
            The Urban Simple standard
          </h2>
          <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
            Drag the slider to see the transformation our team delivers every night.
          </p>
        </motion.div>

        {/* Slider */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div
            ref={containerRef}
            className="relative aspect-[16/9] max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-elevated cursor-ew-resize select-none touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* After Image (full, underneath) */}
            <div className="absolute inset-0">
              <Image
                src={AFTER_IMAGE}
                alt="Kitchen after Urban Simple cleaning"
                fill
                className="object-cover"
                draggable={false}
              />
            </div>

            {/* Before Image (clipped) */}
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
              <Image
                src={BEFORE_IMAGE}
                alt="Kitchen before Urban Simple cleaning"
                fill
                className="object-cover"
                draggable={false}
              />
            </div>

            {/* Labels */}
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-charcoal-900/70 backdrop-blur-sm rounded-lg text-white text-sm font-semibold pointer-events-none">
              Before
            </div>
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-ocean-600/80 backdrop-blur-sm rounded-lg text-white text-sm font-semibold pointer-events-none">
              After
            </div>

            {/* Slider Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
              style={{ left: `${sliderPosition}%` }}
            />

            {/* Slider Handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 w-12 h-12 rounded-full bg-white shadow-xl border-2 border-white flex items-center justify-center"
              style={{ left: `${sliderPosition}%` }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-charcoal-600">
                <path d="M7 4L3 10L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 4L17 10L13 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
