'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { faqItems } from './landing-data'
import { fadeInUp, staggerContainer } from './landing-animations'

export function FAQSection() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="faq" ref={ref} className="py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center mb-12"
        >
          <motion.div variants={fadeInUp}>
            <Badge variant="secondary" className="mb-4 bg-sage-100 text-sage-700 border-sage-200">
              FAQ
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-charcoal-900 leading-tight tracking-tight mb-4">
              Frequently asked questions
            </h2>
            <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
              Everything you need to know about working with Urban Simple.
            </p>
          </motion.div>
        </motion.div>

        {/* Two-column FAQ grid */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid md:grid-cols-2 gap-6 lg:gap-8"
        >
          {faqItems.map((item, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Accordion type="single" collapsible>
                <AccordionItem
                  value={`faq-${index}`}
                  className="border border-cream-200 rounded-xl px-6 data-[state=open]:border-ocean-200 data-[state=open]:shadow-card transition-all"
                >
                  <AccordionTrigger className="text-left text-base font-semibold text-charcoal-900 hover:text-ocean-700 py-5 [&[data-state=open]]:text-ocean-700">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-charcoal-600 text-base leading-relaxed pb-5">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
