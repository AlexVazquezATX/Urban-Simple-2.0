import { Hero } from '@/components/landing/walkthrough/Hero'
import { WhyUrbanSimple } from '@/components/landing/walkthrough/WhyUrbanSimple'
import { HowItWorks } from '@/components/landing/walkthrough/HowItWorks'
import { ServicesGrid } from '@/components/landing/walkthrough/ServicesGrid'
import { FAQ } from '@/components/landing/walkthrough/FAQ'
import { FinalCTA } from '@/components/landing/walkthrough/FinalCTA'
import { StickyMobileCTA } from '@/components/landing/walkthrough/StickyMobileCTA'
import { Footer } from '@/components/landing/walkthrough/Footer'
import { CONTACT } from '@/components/landing/landing-data'

const localBusinessJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Urban Simple LLC',
  description:
    'Commercial cleaning for Austin restaurants, bars, and hotels. Overnight and turn-day cleaning for food and beverage and hospitality venues.',
  url: 'https://urbansimple.net/walkthrough',
  telephone: CONTACT.phone,
  email: CONTACT.email,
  image: 'https://urbansimple.net/images/Urban%20Simple%20Logos/Urban%20Simple%20Logo.png',
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    streetAddress: CONTACT.addressLine1,
    addressLocality: 'Austin',
    addressRegion: 'TX',
    postalCode: '78703',
    addressCountry: 'US',
  },
  areaServed: [
    { '@type': 'City', name: 'Austin' },
    { '@type': 'AdministrativeArea', name: 'Greater Austin Area' },
  ],
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
      opens: '00:00',
      closes: '23:59',
    },
  ],
  award: [
    'Inc. 5000 Texas 2020',
    'Inc. 5000 Texas 2022',
    'Inc. 5000 Texas 2024',
  ],
}

export default function WalkthroughPage() {
  return (
    <main id="main" className="bg-cream-50 text-charcoal-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <Hero />
      <WhyUrbanSimple />
      <HowItWorks />
      <ServicesGrid />
      <FAQ />
      <FinalCTA />
      <Footer />
      <StickyMobileCTA />
    </main>
  )
}
