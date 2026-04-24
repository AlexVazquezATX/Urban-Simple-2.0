'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  fadeInUp,
  staggerContainer,
} from '@/components/landing/landing-animations'

const services = [
  {
    label: 'Dishwashing and pot wash',
    image: '/images/Services-1767818882/service-4.jpg',
  },
  {
    label: 'Kitchen deep clean',
    image: '/images/Services-1767818882/service-1.jpg',
  },
  {
    label: 'Front of house nightly',
    image: '/images/Services-1767818882/service-2.jpg',
  },
  {
    label: 'Floor care (tile, grout, concrete)',
    image: '/images/Services-1767818882/service-3.jpg',
  },
  {
    label: 'Hood and vent (through licensed partner)',
    image: '/images/Services-1767818882/service-6.jpg',
  },
  {
    label: 'Restroom program',
    image: '/images/Services-1767818882/service-8.jpg',
  },
  {
    label: 'Hotel housekeeping support',
    image: '/images/Services-1767818882/service-9.jpg',
  },
  {
    label: 'Back-of-house sanitization',
    image: '/images/Services-1767818882/service-10.jpg',
  },
]

export function ServicesGrid() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      ref={ref}
      aria-labelledby="services-heading"
      className="bg-white py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="mb-12 max-w-2xl"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-bronze-600">
            What we clean
          </p>
          <h2
            id="services-heading"
            className="font-display text-3xl font-semibold leading-tight tracking-tight text-charcoal-900 sm:text-4xl lg:text-5xl"
          >
            Full-program coverage for the venues we serve.
          </h2>
        </motion.div>

        <motion.ul
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
        >
          {services.map(({ label, image }) => (
            <motion.li
              key={label}
              variants={fadeInUp}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="group relative overflow-hidden rounded-xl bg-charcoal-900 shadow-soft"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={image}
                  alt={label}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover opacity-85 transition-all duration-700 group-hover:scale-110 group-hover:opacity-95"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/40 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-4 text-sm font-semibold text-cream-50 sm:text-base">
                  {label}
                </span>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
