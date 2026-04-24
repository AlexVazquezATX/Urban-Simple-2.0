'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowUpRight, Award, ShieldCheck } from 'lucide-react'
import { fadeInUp } from '@/components/landing/landing-animations'

export function FinalCTA() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  const handleScrollToForm = (
    e: React.MouseEvent<HTMLAnchorElement>,
  ) => {
    e.preventDefault()
    const el = document.getElementById('walkthrough-form')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const firstInput = el.querySelector<HTMLInputElement>('input, select, textarea')
      firstInput?.focus({ preventScroll: true })
    }
  }

  return (
    <section
      ref={ref}
      id="final-cta"
      aria-labelledby="final-cta-heading"
      className="relative overflow-hidden bg-cream-50 py-20 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-0 bg-pattern-dots opacity-40" aria-hidden />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-3xl bg-charcoal-950 p-8 text-cream-50 shadow-elevated sm:p-12 lg:p-16"
        >
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-bronze-500/30 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-ocean-500/20 blur-3xl"
            aria-hidden
          />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2
                id="final-cta-heading"
                className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
              >
                Ready to see what a clean handoff looks like?
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-cream-200 sm:text-lg">
                Free walkthrough, written quote within 48 hours, no pitch. Alex calls you back the same business day.
              </p>

              <div className="mt-8">
                <a
                  href="#walkthrough-form"
                  onClick={handleScrollToForm}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-700 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:from-ocean-600 hover:to-ocean-800 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean-300"
                >
                  Book my free walkthrough
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </a>
              </div>
            </div>

            <ul className="grid gap-4">
              <li className="flex items-start gap-3 rounded-xl border border-cream-50/10 bg-cream-50/5 p-4 backdrop-blur">
                <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-bronze-500/20 text-bronze-300 ring-1 ring-bronze-400/40">
                  <Award className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold text-cream-50">Inc. 5000 Texas · 2020, 2022, 2024</p>
                  <p className="mt-0.5 text-sm text-cream-300">
                    Three-time honoree for fastest-growing companies.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-xl border border-cream-50/10 bg-cream-50/5 p-4 backdrop-blur">
                <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-ocean-500/20 text-ocean-300 ring-1 ring-ocean-400/40">
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold text-cream-50">Insured &amp; operator-run</p>
                  <p className="mt-0.5 text-sm text-cream-300">
                    General liability and workers comp. COIs on request.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
