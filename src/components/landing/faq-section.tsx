'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { faqItems } from './landing-data'
import { fadeInUp, staggerContainer } from './landing-animations'

export function FAQSection() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [activeIndex, setActiveIndex] = useState(0)

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

        {/* Interactive split panel */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="rounded-2xl overflow-hidden shadow-card border border-cream-200"
        >
          <div className="grid lg:grid-cols-2 min-h-[480px]">
            {/* Left: Dark panel with question list */}
            <div className="bg-charcoal-900 p-6 lg:p-8 flex flex-col">
              <p className="text-ocean-400 font-medium text-sm uppercase tracking-widest mb-6">
                Select a Question
              </p>
              <div className="space-y-1 flex-1">
                {faqItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-start gap-3 group ${
                      activeIndex === index
                        ? 'bg-ocean-500/20 text-white'
                        : 'text-charcoal-400 hover:text-white hover:bg-charcoal-800'
                    }`}
                  >
                    <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 transition-colors ${
                      activeIndex === index
                        ? 'bg-ocean-500 text-white'
                        : 'bg-charcoal-700 text-charcoal-400 group-hover:bg-charcoal-600'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium leading-snug">{item.question}</span>
                  </button>
                ))}
              </div>

              {/* Navigation dots */}
              <div className="flex items-center justify-center gap-2 pt-6 mt-4 border-t border-charcoal-800">
                {faqItems.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                      activeIndex === index
                        ? 'bg-ocean-500 scale-125'
                        : 'bg-charcoal-700 hover:bg-charcoal-500'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Right: White panel with animated answer */}
            <div className="bg-white p-8 lg:p-10 flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-10 h-10 rounded-full bg-ocean-100 flex items-center justify-center text-sm font-bold text-ocean-600">
                      {activeIndex + 1}
                    </span>
                    <span className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">
                      Question {activeIndex + 1} of {faqItems.length}
                    </span>
                  </div>
                  <h3 className="font-display text-xl lg:text-2xl font-semibold text-charcoal-900 mb-4 leading-snug">
                    {faqItems[activeIndex].question}
                  </h3>
                  <p className="text-charcoal-600 text-base leading-relaxed">
                    {faqItems[activeIndex].answer}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
