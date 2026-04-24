'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { FileText, PhoneCall, ClipboardCheck } from 'lucide-react'
import {
  fadeInUp,
  staggerContainer,
} from '@/components/landing/landing-animations'

const steps = [
  {
    number: '01',
    icon: FileText,
    title: 'Fill out the form.',
    body: 'Takes 90 seconds.',
    image: '/images/Services-1767818882/service-10.jpg',
    alt: 'Urban Simple crew member preparing for shift',
  },
  {
    number: '02',
    icon: PhoneCall,
    title: 'We confirm by email right away.',
    body: 'A phone call from Alex follows during business hours.',
    image: '/images/Team-1767818889/3C1A9251.jpg',
    alt: 'Alex Vazquez from Urban Simple',
  },
  {
    number: '03',
    icon: ClipboardCheck,
    title: 'Free walkthrough.',
    body: 'No obligation, no pressure, written quote within 48 hours.',
    image: '/images/Services-1767818882/service-1.jpg',
    alt: 'Clean commercial kitchen after Urban Simple service',
  },
]

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      ref={ref}
      aria-labelledby="how-it-works-heading"
      className="bg-cream-100 py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="mb-14 max-w-2xl"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-bronze-600">
            How it works
          </p>
          <h2
            id="how-it-works-heading"
            className="font-display text-3xl font-semibold leading-tight tracking-tight text-charcoal-900 sm:text-4xl lg:text-5xl"
          >
            Three steps to a clean handoff.
          </h2>
        </motion.div>

        <motion.ol
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid gap-6 md:grid-cols-3"
        >
          {steps.map(({ number, icon: Icon, title, body, image, alt }) => (
            <motion.li
              key={number}
              variants={fadeInUp}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-soft transition-shadow hover:shadow-card"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-charcoal-100">
                <Image
                  src={image}
                  alt={alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/30 via-transparent to-transparent" />
                <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-cream-50/95 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-charcoal-900 backdrop-blur">
                  <Icon className="h-3.5 w-3.5 text-bronze-600" aria-hidden />
                  Step {number}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-xl font-semibold text-charcoal-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-600">
                  {body}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  )
}
