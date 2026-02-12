import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — BackHaus',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/studio" className="inline-flex items-center gap-1.5 justify-center">
            <Image
              src="/images/backhaus-logos/backhaus-logo-compact.png"
              alt="BackHaus"
              width={200}
              height={40}
              className="h-7 w-auto opacity-70"
            />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mb-0.5" />
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-warm-200 p-6 md:p-8">
          <h1 className="text-2xl font-display font-semibold text-charcoal-900 mb-1">
            Terms of Service
          </h1>
          <p className="text-sm text-warm-400 mb-6">Last updated: February 2026</p>

          <div className="prose prose-sm prose-warm max-w-none text-warm-700 space-y-4">
            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using BackHaus (&quot;the Service&quot;), operated by Urban Simple LLC,
              you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
            </p>

            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">2. Description of Service</h2>
            <p>
              BackHaus is an AI-powered creative studio that generates food photography and
              branded content for restaurants and hospitality businesses. The Service includes
              image generation, gallery management, and brand kit features.
            </p>

            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">3. Accounts</h2>
            <p>
              You must provide accurate information when creating an account. You are responsible
              for maintaining the security of your account credentials and for all activity that
              occurs under your account.
            </p>

            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">4. Subscription & Billing</h2>
            <p>
              Paid plans are billed monthly through Stripe. You may cancel at any time; your access
              continues through the end of the current billing period. Refunds are handled on a
              case-by-case basis.
            </p>

            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">5. Content & Ownership</h2>
            <p>
              You retain ownership of the content you provide (descriptions, brand assets, etc.).
              AI-generated images created through BackHaus are licensed to you for commercial use.
              You may not resell generated images as standalone products.
            </p>

            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">6. Acceptable Use</h2>
            <p>
              You agree not to use the Service to generate illegal, harmful, misleading, or
              inappropriate content. We reserve the right to suspend accounts that violate this policy.
            </p>

            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">7. Limitation of Liability</h2>
            <p>
              The Service is provided &quot;as is.&quot; Urban Simple LLC is not liable for any indirect,
              incidental, or consequential damages arising from your use of the Service. Our total
              liability shall not exceed the amount you paid us in the prior 12 months.
            </p>

            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">8. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the Service after
              changes constitutes acceptance of the new terms. We will notify you of material changes
              via email.
            </p>

            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">9. Contact</h2>
            <p>
              Questions about these terms? Contact us at{' '}
              <a href="mailto:support@backhaus.ai" className="text-ocean-600 hover:text-ocean-700">
                support@backhaus.ai
              </a>
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/studio/signup" className="text-sm text-warm-500 hover:text-warm-700">
            Back to sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
