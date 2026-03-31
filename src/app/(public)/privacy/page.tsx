import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-baseline gap-1">
            <span className="font-bold text-2xl tracking-tight text-charcoal-900">Urban</span>
            <span className="font-display italic font-normal text-2xl text-ocean-600">Simple</span>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-cream-200 p-6 md:p-8">
          <h1 className="text-2xl font-display font-semibold text-charcoal-900 mb-1">
            Privacy Policy
          </h1>
          <p className="text-sm text-charcoal-500 mb-6">Last updated: March 31, 2026</p>

          <div className="prose prose-charcoal max-w-none text-sm leading-relaxed space-y-4">
            <p>
              Urban Simple (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the urbansimple.net website. This page informs you of our policies regarding the collection, use, and disclosure of personal information when you use our website.
            </p>

            <h2 className="text-lg font-semibold text-charcoal-900 mt-6">Information We Collect</h2>
            <p>
              When you request a quote, schedule a walkthrough, or contact us, we may collect your name, email address, phone number, company name, and property details. We use this information solely to respond to your inquiry and provide our services.
            </p>

            <h2 className="text-lg font-semibold text-charcoal-900 mt-6">How We Use Your Information</h2>
            <p>
              We use the information we collect to provide and improve our cleaning services, respond to your requests, send service-related communications, and comply with legal obligations.
            </p>

            <h2 className="text-lg font-semibold text-charcoal-900 mt-6">Data Security</h2>
            <p>
              We take reasonable measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure.
            </p>

            <h2 className="text-lg font-semibold text-charcoal-900 mt-6">Third-Party Services</h2>
            <p>
              We may use third-party services (such as analytics and email providers) that collect, monitor, and analyze data to improve our service. These third parties have their own privacy policies.
            </p>

            <h2 className="text-lg font-semibold text-charcoal-900 mt-6">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:info@urbansimple.net" className="text-ocean-600 hover:underline">info@urbansimple.net</a>{' '}
              or call <a href="tel:+18005134157" className="text-ocean-600 hover:underline">(800) 513-4157</a>.
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/landing" className="text-sm text-charcoal-500 hover:text-charcoal-700">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
