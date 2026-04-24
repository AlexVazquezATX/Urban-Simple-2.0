'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Quote } from 'lucide-react'
import { fadeInUp } from '@/components/landing/landing-animations'

export function TestimonialBand() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      ref={ref}
      aria-labelledby="testimonial-heading"
      className="relative overflow-hidden bg-charcoal-950 py-20 text-cream-50 lg:py-28"
    >
      <div className="absolute inset-0 opacity-30">
        <Image
          src="/images/Services-1767818882/service-1.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-charcoal-950/80" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <Quote
            className="mx-auto mb-6 h-10 w-10 text-bronze-400"
            aria-hidden
          />
          <h2
            id="testimonial-heading"
            className="font-display text-2xl font-semibold italic leading-tight sm:text-3xl lg:text-4xl"
          >
            &ldquo;Since Urban Simple took over, we achieved a 99 health inspection score. Their team is thorough and understands food service.&rdquo;
          </h2>
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="relative h-10 w-28">
              <Image
                src="/images/Clients-1767818842/client-brand_Facebook-trans.png"
                alt="Meta (Facebook)"
                fill
                sizes="112px"
                className="object-contain brightness-0 invert"
              />
            </div>
            <p className="text-sm font-medium text-cream-200">
              Matt Luther · Facilities Manager, Facebook (Meta)
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
