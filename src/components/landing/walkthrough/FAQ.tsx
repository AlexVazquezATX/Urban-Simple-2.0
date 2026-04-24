'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Plus } from 'lucide-react'
import { fadeInUp, staggerContainer } from '@/components/landing/landing-animations'

const faqs = [
  {
    q: 'Do you work outside of Austin proper?',
    a: 'Yes, we serve surrounding areas regularly.',
  },
  {
    q: 'Are you insured and bonded?',
    a: 'Yes. General liability and workers comp. COIs on request.',
  },
  {
    q: 'How quickly can you start?',
    a: 'Most new accounts start within 5 to 10 business days.',
  },
  {
    q: 'Is the walkthrough really free?',
    a: 'Yes. No obligation.',
  },
  {
    q: 'How do you handle staffing issues?',
    a: 'Every location has a backup. Your dedicated operations manager is the escalation point.',
  },
]

export function FAQ() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section
      ref={ref}
      aria-labelledby="faq-heading"
      className="bg-cream-100 py-20 lg:py-28"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-bronze-600">
            FAQ
          </p>
          <h2
            id="faq-heading"
            className="font-display text-3xl font-semibold leading-tight tracking-tight text-charcoal-900 sm:text-4xl lg:text-5xl"
          >
            Questions we get.
          </h2>
        </motion.div>

        <motion.ul
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-soft"
        >
          {faqs.map((item, index) => {
            const isOpen = openIndex === index
            const panelId = `faq-panel-${index}`
            const buttonId = `faq-button-${index}`
            return (
              <motion.li
                key={item.q}
                variants={fadeInUp}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="border-b border-cream-200 last:border-b-0"
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex min-h-[64px] w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-charcoal-900 transition-colors hover:bg-cream-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-bronze-500 sm:px-6 sm:text-lg"
                  >
                    <span className={isOpen ? 'text-bronze-700' : ''}>{item.q}</span>
                    <span
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-full transition-all ${
                        isOpen
                          ? 'rotate-45 bg-bronze-500 text-cream-50'
                          : 'bg-cream-200 text-charcoal-700'
                      }`}
                      aria-hidden
                    >
                      <Plus className="h-4 w-4" />
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-sm leading-relaxed text-charcoal-700 sm:px-6 sm:text-base">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            )
          })}
        </motion.ul>
      </div>
    </section>
  )
}
