import Link from 'next/link'
import type { Metadata } from 'next'
import { SMS_CONSENT_TEXT, SMS_HELP_REPLY, SMS_PROGRAM_NAME } from '@/lib/notify/sms-consent'

export const metadata: Metadata = {
  title: 'Service Alert Text Messages',
}

// Public description of the SMS program. Opt-in itself happens behind a login
// (client portal, staff profile), so this is the page carriers review for
// A2P 10DLC: who gets texts, how they opt in, the exact consent wording.
export default function TextAlertsPage() {
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
            {SMS_PROGRAM_NAME}
          </h1>
          <p className="text-sm text-charcoal-500 mb-6">Text messages about your cleaning service</p>

          <div className="prose prose-charcoal max-w-none text-sm leading-relaxed space-y-4">
            <p>
              Urban Simple provides commercial cleaning for hotels, restaurants and commercial kitchens. Our clients and staff can choose to get text alerts about the status of scheduled cleanings. Texts are never used for marketing.
            </p>

            <h2 className="text-lg font-semibold text-charcoal-900 mt-6">What we text</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>An item on the cleaning checklist was not finished during a visit, and why.</li>
              <li>Updates and resolutions on a service issue you reported or follow.</li>
              <li>For our staff: a crew member has not clocked in, or an issue needs attention.</li>
            </ul>
            <p>Example:</p>
            <p className="rounded-md bg-cream-100 px-4 py-3 font-mono text-[13px]">
              Urban Simple: 1 item(s) not finished tonight at Main Kitchen: Hood filters (ran out of time). Details: https://www.urbansimple.net/portal/issues/... Reply STOP to opt out.
            </p>

            <h2 className="text-lg font-semibold text-charcoal-900 mt-6">How to opt in</h2>
            <p>
              <strong>Clients:</strong> sign in to the Urban Simple client portal, open <em>Alerts</em>, turn on text alerts, enter your mobile number and check this box:
            </p>
            <p className="rounded-md border border-cream-300 px-4 py-3">
              &#9744; {SMS_CONSENT_TEXT}
            </p>
            <p>
              Texts start only after you check the box and save. The box is never pre-checked.
            </p>
            <p>
              <strong>Staff:</strong> Urban Simple managers can turn on <em>Text me alerts</em> in their own profile in the Urban Simple app and add their mobile number. The same terms apply.
            </p>

            <h2 className="text-lg font-semibold text-charcoal-900 mt-6">Frequency, cost and opting out</h2>
            <p>
              Message frequency varies with service activity. Message and data rates may apply. Reply <strong>STOP</strong> to any message to opt out at any time; you will get one confirmation and no further texts. Reply <strong>START</strong> to opt back in. Reply <strong>HELP</strong> for help, or contact{' '}
              <a href="mailto:info@urbansimple.net" className="text-ocean-600 hover:underline">info@urbansimple.net</a>{' '}
              or <a href="tel:+18005134157" className="text-ocean-600 hover:underline">(800) 513-4157</a>.
            </p>
            <p>HELP reply:</p>
            <p className="rounded-md bg-cream-100 px-4 py-3 font-mono text-[13px]">{SMS_HELP_REPLY}</p>
            <p>Carriers are not liable for delayed or undelivered messages.</p>

            <h2 className="text-lg font-semibold text-charcoal-900 mt-6">Privacy</h2>
            <p>
              No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. Text messaging opt-in data and consent are not shared with any third parties. See our{' '}
              <Link href="/privacy" className="text-ocean-600 hover:underline">Privacy Policy</Link> and{' '}
              <Link href="/terms" className="text-ocean-600 hover:underline">Terms of Service</Link>.
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
