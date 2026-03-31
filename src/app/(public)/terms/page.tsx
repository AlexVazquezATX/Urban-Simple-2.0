import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
}

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-charcoal-500 mb-6">Last updated: March 31, 2026</p>

          <div className="prose prose-charcoal max-w-none text-sm leading-relaxed space-y-4">
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your use of the urbansimple.net website and the commercial cleaning services provided by Urban Simple (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
            </p>

            <h2 className="text-lg font-semibold text-charcoal-900 mt-6">Services</h2>
            <p>
              Urban Simple provides commercial cleaning services for hospitality businesses including hotels, restaurants, event venues, and commercial kitchens. All services are provided pursuant to a separate service agreement specific to your property.
            </p>

            <h2 className="text-lg font-semibold text-charcoal-900 mt-6">Use of Website</h2>
            <p>
              You may use this website to learn about our services, request quotes, schedule walkthroughs, and access the client portal. You agree not to misuse the website or attempt to access it through unauthorized means.
            </p>

            <h2 className="text-lg font-semibold text-charcoal-900 mt-6">Quote Requests</h2>
            <p>
              Quotes provided through this website are estimates based on the information you provide. Final pricing is determined after an on-site walkthrough and assessment of your facility.
            </p>

            <h2 className="text-lg font-semibold text-charcoal-900 mt-6">Limitation of Liability</h2>
            <p>
              Urban Simple shall not be liable for any indirect, incidental, or consequential damages arising from the use of this website. Our total liability is limited to the amount paid for services rendered.
            </p>

            <h2 className="text-lg font-semibold text-charcoal-900 mt-6">Changes to Terms</h2>
            <p>
              We reserve the right to update these Terms at any time. Continued use of the website constitutes acceptance of the revised Terms.
            </p>

            <h2 className="text-lg font-semibold text-charcoal-900 mt-6">Contact Us</h2>
            <p>
              If you have questions about these Terms, please contact us at{' '}
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
