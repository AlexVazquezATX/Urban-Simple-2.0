'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ClipboardCheck, Users, TrendingUp } from 'lucide-react'
import {
  fadeInUp,
  fadeInRight,
  staggerContainer,
} from '@/components/landing/landing-animations'

const cards = [
  {
    icon: ClipboardCheck,
    title: 'Food and beverage is all we do.',
    body: 'We know what a hood vent looks like at 4am. We know what health inspectors flag.',
    accent: 'bronze' as const,
  },
  {
    icon: Users,
    title: 'Managers on the ground.',
    body: 'Julio and Yoifranger walk every location. You get one escalation point and it is not a call center.',
    accent: 'ocean' as const,
  },
  {
    icon: TrendingUp,
    title: 'Built to scale with you.',
    body: 'Whether you are one café or a hotel group, the team, the systems, and the reporting scale cleanly.',
    accent: 'sage' as const,
  },
]

const accentClasses = {
  bronze: 'bg-bronze-100 text-bronze-700 ring-bronze-200',
  terracotta: 'bg-terracotta-100 text-terracotta-700 ring-terracotta-200',
  ocean: 'bg-ocean-100 text-ocean-700 ring-ocean-200',
  sage: 'bg-sage-100 text-sage-700 ring-sage-200',
}

export function WhyUrbanSimple() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      ref={ref}
      aria-labelledby="why-heading"
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
            Why Urban Simple
          </p>
          <h2
            id="why-heading"
            className="font-display text-3xl font-semibold leading-tight tracking-tight text-charcoal-900 sm:text-4xl lg:text-5xl"
          >
            Built for the venues that cannot afford to open dirty.
          </h2>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <motion.div
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={fadeInRight}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative overflow-hidden rounded-3xl bg-charcoal-900 text-cream-50 shadow-elevated"
          >
            <div className="relative aspect-[4/5] sm:aspect-[16/11] lg:aspect-auto lg:h-full lg:min-h-[520px]">
              <Image
                src="/images/Team-1767818889/team_Alex-and-Demian-Vazquez.jpg"
                alt="Co-founders Alex and Demian Vazquez"
                fill
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/50 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-bronze-300">
                  Operator to operator
                </p>
                <h3 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">
                  Alex and Demian ran venues before they ran a cleaning company.
                </h3>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-cream-200 sm:text-base">
                  You get someone who has been in your kitchen at 2am, not a sales rep.
                </p>
                <p className="mt-4 text-xs font-medium uppercase tracking-wider text-cream-300">
                  Alex Vazquez &amp; Demian Vazquez · Co-founders
                </p>
              </div>
            </div>
          </motion.div>

          <motion.ul
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={staggerContainer}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1"
          >
            {cards.map(({ icon: Icon, title, body, accent }) => (
              <motion.li
                key={title}
                variants={fadeInUp}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="flex h-full flex-col rounded-2xl border border-cream-200 bg-gradient-card p-6 shadow-soft"
              >
                <span
                  className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${accentClasses[accent]}`}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="font-display text-lg font-semibold text-charcoal-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-600">{body}</p>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </div>
    </section>
  )
}
