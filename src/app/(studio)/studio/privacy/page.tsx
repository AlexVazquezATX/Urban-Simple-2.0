import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — BackHaus',
}

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-sm text-warm-400 mb-6">Last updated: February 2026</p>

          <div className="prose prose-sm prose-warm max-w-none text-warm-700 space-y-4">
            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">1. Information We Collect</h2>
            <p>
              We collect information you provide directly: your name, email address, restaurant name,
              and payment information (processed securely by Stripe). We also collect usage data such
              as image generation counts and feature usage to improve the Service.
            </p>

            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide and maintain the BackHaus service</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send transactional emails (welcome, receipts, password resets)</li>
              <li>Improve our AI image generation quality</li>
              <li>Respond to support requests</li>
            </ul>

            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">3. AI-Generated Content</h2>
            <p>
              Text descriptions you provide are sent to third-party AI services (Google) to generate
              images. We do not use your content to train AI models. Generated images are stored
              securely and accessible only to your account.
            </p>

            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">4. Data Sharing</h2>
            <p>
              We do not sell your personal information. We share data only with service providers
              necessary to operate BackHaus:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> — Authentication and database hosting</li>
              <li><strong>Stripe</strong> — Payment processing</li>
              <li><strong>Google Cloud</strong> — AI image generation</li>
              <li><strong>Resend</strong> — Transactional email delivery</li>
              <li><strong>Vercel</strong> — Application hosting</li>
            </ul>

            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">5. Data Security</h2>
            <p>
              We use industry-standard security measures including encrypted connections (HTTPS),
              secure authentication, and access controls. Payment information is handled entirely
              by Stripe and never touches our servers.
            </p>

            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">6. Data Retention</h2>
            <p>
              We retain your account data and generated images for as long as your account is active.
              If you delete your account, we will remove your personal data within 30 days.
              Generated images may be retained for up to 90 days in backups.
            </p>

            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">7. Your Rights</h2>
            <p>
              You can access, update, or delete your personal information from your account settings,
              or by contacting us. You may request a copy of your data or ask us to delete your
              account entirely.
            </p>

            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">8. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. We will notify you of material changes
              via email or a notice in the Service.
            </p>

            <h2 className="text-base font-display font-medium text-charcoal-900 mt-6 mb-2">9. Contact</h2>
            <p>
              Questions about your privacy? Contact us at{' '}
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
