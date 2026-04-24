import Image from 'next/image'
import Link from 'next/link'
import { Award, MapPin } from 'lucide-react'
import { LeadForm } from './LeadForm'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-warm pt-10 pb-12 sm:pt-14 lg:pt-20 lg:pb-24">
      <div className="pointer-events-none absolute inset-0 bg-pattern-dots opacity-40" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8">
        <div className="flex flex-col justify-center">
          <Link href="/" className="mb-8 inline-flex items-center gap-2">
            <Image
              src="/images/Urban Simple Logos/Urban Simple Logo.png"
              alt="Urban Simple"
              width={220}
              height={48}
              priority
              className="h-9 w-auto"
            />
            <span className="sr-only">Urban Simple home</span>
          </Link>

          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-charcoal-900 sm:text-5xl lg:text-6xl">
            Commercial cleaning built for Austin&apos;s best restaurants, bars, and hotels.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-charcoal-700 sm:text-xl">
            Urban Simple handles overnight and turn-day cleaning for the food and beverage venues that cannot afford to open dirty. Tell us about your space and we&apos;ll be in touch right away.
          </p>

          <ul className="mt-8 flex flex-col gap-3 text-sm text-charcoal-700 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
            <li className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bronze-100 text-bronze-700">
                <Award className="h-4 w-4" aria-hidden />
              </span>
              <span>Inc. 5000 Texas — 2020, 2022, 2024</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ocean-100 text-ocean-700">
                <MapPin className="h-4 w-4" aria-hidden />
              </span>
              <span>Austin-based and operator-run</span>
            </li>
          </ul>
        </div>

        <div id="walkthrough-form" className="scroll-mt-24">
          <LeadForm formId="lead-form-hero" variant="hero" />
        </div>
      </div>
    </section>
  )
}
