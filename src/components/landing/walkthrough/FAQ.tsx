'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

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
    a: 'Every location has a backup. Julio or Yoifranger is the escalation point.',
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section aria-labelledby="faq-heading" className="bg-cream-100 py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-bronze-600">
            FAQ
          </p>
          <h2
            id="faq-heading"
            className="font-display text-3xl font-semibold leading-tight tracking-tight text-charcoal-900 sm:text-4xl"
          >
            Questions we get.
          </h2>
        </div>

        <ul className="divide-y divide-cream-200 overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-soft">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index
            const panelId = `faq-panel-${index}`
            const buttonId = `faq-button-${index}`
            return (
              <li key={item.q}>
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-charcoal-900 transition-colors hover:bg-cream-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-bronze-500 min-h-[56px]"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 flex-none text-charcoal-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  className="px-5 pb-5 text-sm leading-relaxed text-charcoal-700"
                >
                  {item.a}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
