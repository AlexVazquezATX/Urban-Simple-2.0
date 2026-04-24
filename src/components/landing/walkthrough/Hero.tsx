'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Award, MapPin } from 'lucide-react'
import { LeadForm } from './LeadForm'
import { fadeInUp, fadeInRight } from '@/components/landing/landing-animations'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-charcoal-950 text-cream-50">
      <div className="absolute inset-0">
        <Image
          src="/images/Headers-1767818867/Urban-Simple-Team-in-Front-of-HQ-Viviana-Replacement.jpg"
          alt="Urban Simple team in front of headquarters"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal-950 via-charcoal-950/80 to-charcoal-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:px-8 lg:pb-28 lg:pt-16">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col"
        >
          <Link href="/" className="mb-10 inline-flex items-center gap-2">
            <Image
              src="/images/Urban Simple Logos/Urban Simple Logo.png"
              alt="Urban Simple"
              width={220}
              height={48}
              priority
              className="h-9 w-auto brightness-0 invert"
            />
            <span className="sr-only">Urban Simple home</span>
          </Link>

          <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-cream-50/20 bg-cream-50/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-cream-100 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-bronze-400" aria-hidden />
            Free walkthrough · Austin, TX
          </span>

          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Commercial cleaning built for Austin&apos;s best restaurants, bars, and hotels.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream-200 sm:text-xl">
            Urban Simple handles overnight and turn-day cleaning for the food and beverage venues that cannot afford to open dirty. Tell us about your space and we&apos;ll be in touch right away.
          </p>

          <ul className="mt-8 flex flex-col gap-3 text-sm text-cream-100 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
            <li className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bronze-500/20 text-bronze-300 ring-1 ring-bronze-400/40">
                <Award className="h-4 w-4" aria-hidden />
              </span>
              <span className="font-medium">Inc. 5000 Texas · 2020, 2022, 2024</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ocean-500/20 text-ocean-300 ring-1 ring-ocean-400/40">
                <MapPin className="h-4 w-4" aria-hidden />
              </span>
              <span className="font-medium">Austin-based and operator-run</span>
            </li>
          </ul>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInRight}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          id="walkthrough-form"
          className="scroll-mt-24"
        >
          <LeadForm formId="lead-form-hero" variant="hero" />
        </motion.div>
      </div>
    </section>
  )
}
