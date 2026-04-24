'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { fadeInUp } from '@/components/landing/landing-animations'

interface InlineCTAProps {
  headline: string
  label?: string
  tone?: 'light' | 'cream'
}

function scrollToForm(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  const el = document.getElementById('walkthrough-form')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const firstInput = el.querySelector<HTMLInputElement>('input, select, textarea')
    firstInput?.focus({ preventScroll: true })
  }
}

export function InlineCTA({
  headline,
  label = 'Book your free walkthrough',
  tone = 'light',
}: InlineCTAProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const bg = tone === 'cream' ? 'bg-cream-100' : 'bg-white'
  const borderTop = tone === 'cream' ? 'border-t border-cream-200' : ''

  return (
    <section aria-label="Book your free walkthrough" className={`${bg} ${borderTop}`}>
      <div ref={ref} className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-cream-200 bg-gradient-to-br from-cream-50 to-cream-100 p-6 shadow-soft sm:flex-row sm:items-center sm:gap-8 sm:p-7"
        >
          <div className="flex-1">
            <p className="font-display text-xl font-semibold leading-tight text-charcoal-900 sm:text-2xl">
              {headline}
            </p>
            <p className="mt-1 text-sm text-charcoal-600">
              Free, no obligation, written quote within 48 hours.
            </p>
          </div>
          <a
            href="#walkthrough-form"
            onClick={scrollToForm}
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-700 px-5 py-3 text-sm font-semibold text-white shadow-card transition-all hover:from-ocean-600 hover:to-ocean-800 hover:shadow-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean-400 sm:text-base"
          >
            {label}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
