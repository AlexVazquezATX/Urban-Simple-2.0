import Link from 'next/link'
import type { Metadata } from 'next'
import { SMS_CONSENT_TEXT, SMS_HELP_REPLY, SMS_PROGRAM_NAME } from '@/lib/notify/sms-consent'

export const metadata: Metadata = {
  title: 'Service Alert Text Messages',
}

function OptInScreen({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="not-prose my-4">
      <a href={src} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" className="w-full rounded-md border border-cream-300" />
      </a>
      <figcaption className="mt-2 text-xs text-charcoal-500">{caption}</figcaption>
    </figure>
  )
}

// Public description of the SMS program. Opt-in itself happens behind a login
// (client portal Alerts, staff My Alerts), so this is the page carriers review for
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
              Opt-in happens on web forms behind a login. Texts start only after the person checks the consent box and saves. The box is never pre-checked, and the first text is an opt-in confirmation. Nobody can opt in on another person&apos;s behalf. The screens below show each step, with sample data.
            </p>

            <h3 className="text-base font-semibold text-charcoal-900 mt-4">Clients</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Sign in to the Urban Simple client portal at www.urbansimple.net/portal/login.</li>
              <li>Open <em>Alerts</em> (www.urbansimple.net/portal/alerts).</li>
              <li>Turn on <em>Text alerts</em>, enter a mobile number, check the box and choose <em>Save settings</em>.</li>
            </ol>
            <p>The box reads:</p>
            <p className="rounded-md border border-cream-300 px-4 py-3">
              &#9744; {SMS_CONSENT_TEXT} See our Terms and Privacy Policy.
            </p>
            <OptInScreen
              src="/text-alerts/1-portal-login.png"
              alt="Urban Simple client portal sign-in page with email and password fields"
              caption="Step 1: client portal sign-in."
            />
            <OptInScreen
              src="/text-alerts/2-portal-alerts-consent.png"
              alt="Client portal Alerts page with text alerts on, a mobile number entered, and the unchecked consent box with the full disclosure"
              caption="Steps 2 and 3: the Alerts page in the client portal. The consent box is unchecked until the client checks it."
            />

            <h3 className="text-base font-semibold text-charcoal-900 mt-4">Urban Simple managers</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Sign in to the Urban Simple app at www.urbansimple.net/login.</li>
              <li>Open <em>My Alerts</em> in the menu.</li>
              <li>Turn on <em>Text me alerts</em>, enter a mobile number, check the box with the same wording and choose <em>Save</em>.</li>
            </ol>
            <OptInScreen
              src="/text-alerts/3-staff-my-alerts-consent.png"
              alt="Urban Simple app My Alerts page with text alerts on, a mobile number entered, and the unchecked consent box with the full disclosure"
              caption="The My Alerts page in the Urban Simple app. The consent box is unchecked until the manager checks it."
            />

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
