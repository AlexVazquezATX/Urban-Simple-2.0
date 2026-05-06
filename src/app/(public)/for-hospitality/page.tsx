import Link from 'next/link'
import {
  Camera,
  ClipboardList,
  FileText,
  ShieldCheck,
  ThumbsUp,
  Users,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

// Public marketing page for the Urban Simple Portal sold as a standalone
// SaaS to non-Austin hospitality operators (hotels, restaurants, bars,
// event venues). Drives signups to /portal/signup.

export const metadata = {
  title: 'Urban Simple Portal — Hospitality ops binder',
  description:
    'A digital ops binder for hotels, restaurants, and event venues. Daily walkthroughs, photo trails, document vault, and inspection-ready packets. 14-day free trial.',
}

const features = [
  {
    icon: Camera,
    title: 'Daily walkthrough capture',
    blurb:
      'Your GMs snap photos by zone — kitchen, dish pit, dining, bathrooms — in under three minutes. Builds your inspection trail automatically.',
    accent: 'lime',
  },
  {
    icon: ClipboardList,
    title: 'Issue tracking',
    blurb:
      'Anything that needs attention gets logged with a photo, location, and status. Nothing slips through the cracks between shifts.',
    accent: 'amber',
  },
  {
    icon: FileText,
    title: 'Document vault',
    blurb:
      'Insurance, SDS sheets, training certs, pest logs. One place. Inspector walks in, you tap one button, you have a packet.',
    accent: 'ocean',
  },
  {
    icon: ShieldCheck,
    title: 'Inspection packet',
    blurb:
      'A printable, dated PDF with your active documents, recent walkthroughs, and resolved issues. Ready in seconds.',
    accent: 'plum',
  },
  {
    icon: ThumbsUp,
    title: 'Weekly digest email',
    blurb:
      'Owners and operators get a Monday email with the week at a glance. Photos, issues opened and resolved, visit count.',
    accent: 'ocean',
  },
  {
    icon: Users,
    title: 'Team access',
    blurb:
      'Invite GMs, sous chefs, and owners. Everyone sees the same source of truth. No more group texts or photos lost in DMs.',
    accent: 'plum',
  },
] as const

const accentMap: Record<string, { bg: string; text: string }> = {
  lime: { bg: 'bg-lime-100', text: 'text-lime-700' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  ocean: { bg: 'bg-ocean-50', text: 'text-ocean-600' },
  plum: { bg: 'bg-plum-50', text: 'text-plum-700' },
}

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$29',
    cadence: 'per location / month',
    tagline: 'For single-location operators.',
    features: [
      'One location',
      'Unlimited walkthroughs and issues',
      'Document vault (10 GB)',
      'Inspection packet generator',
      'Weekly digest email',
      'Up to 5 team members',
    ],
    cta: 'Start 14-day free trial',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$79',
    cadence: 'per location / month',
    tagline: 'For multi-unit groups.',
    features: [
      'Up to 10 locations',
      'Everything in Starter',
      'Document vault (100 GB)',
      'Multi-location dashboard',
      'Unlimited team members',
      'Priority email support',
    ],
    cta: 'Start 14-day free trial',
    highlight: true,
  },
] as const

export default function ForHospitalityPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      {/* Top bar */}
      <header className="border-b border-warm-200 bg-white/90 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/for-hospitality" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-ocean-100 text-ocean-700 text-sm font-medium">
              US
            </div>
            <div className="leading-tight">
              <p className="text-sm font-medium text-warm-900">Urban Simple Portal</p>
              <p className="text-[10px] uppercase tracking-wider text-warm-500">For hospitality ops</p>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/portal/login" className="text-warm-600 hover:text-ocean-600">
              Sign in
            </Link>
            <Link
              href="/portal/signup"
              className="inline-flex items-center gap-1 rounded-sm bg-warm-900 px-3 py-1.5 text-white hover:bg-warm-800"
            >
              Start free trial
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-sm border border-lime-200 bg-lime-50 px-2.5 py-1 text-xs font-medium text-lime-800">
            <Sparkles className="h-3.5 w-3.5" />
            New: Self-serve for hospitality teams outside Austin
          </div>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-warm-900 sm:text-5xl lg:text-6xl">
            The ops binder your kitchen team will actually use.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-warm-600">
            Daily walkthroughs, issue tracking, a document vault, and inspection-ready packets.
            Built by Urban Simple from years of running hospitality cleaning ops. Now available as
            a standalone tool for any operator.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/portal/signup"
              className="inline-flex items-center justify-center gap-1.5 rounded-sm bg-warm-900 px-5 py-3 text-sm font-medium text-white hover:bg-warm-800"
            >
              Start your 14-day free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center rounded-sm border border-warm-300 bg-white px-5 py-3 text-sm font-medium text-warm-800 hover:border-warm-400"
            >
              See pricing
            </a>
          </div>
          <p className="mt-3 text-xs text-warm-500">No credit card required. Cancel anytime.</p>
        </div>
      </section>

      {/* Problem framing */}
      <section className="border-y border-warm-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-warm-500">
                The problem
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-warm-900 sm:text-3xl">
                Your ops live in group texts and someone&apos;s phone.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-warm-600">
                Health inspector walks in and you&apos;re digging through emails for a current SDS
                sheet. A walk-in goes down at 2am and the photo your GM sent never made it past the
                shift handoff. The training cert for that new hire? Probably in a desk drawer.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-warm-600">
                Every hospitality operator has lived this. We built this tool because we were
                living it too.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-warm-500">
                The fix
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-warm-900 sm:text-3xl">
                One place. One source of truth. Inspection-ready in seconds.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-warm-600">
                A mobile-first portal your GMs open before service. They walk the line, snap a few
                photos by zone, flag anything that needs attention, and move on. Owners get a
                weekly digest. Inspectors get a clean packet on demand.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-warm-600">
                Built for the way real hospitality teams work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-wider text-warm-500">
            What you get
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-warm-900 sm:text-4xl">
            Everything your team needs in one binder.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const accent = accentMap[f.accent]
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="rounded-sm border border-warm-200 bg-white p-5 hover:border-warm-300 transition-colors"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-sm ${accent.bg} ${accent.text}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-base font-medium text-warm-900">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-warm-600">{f.blurb}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-warm-200 bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-medium uppercase tracking-wider text-warm-500">
              Pricing
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-warm-900 sm:text-4xl">
              Simple, per-location pricing.
            </h2>
            <p className="mt-3 text-sm text-warm-600">
              14 days free. No credit card to start. Cancel anytime.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 md:gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-sm border p-6 ${
                  plan.highlight
                    ? 'border-2 border-lime-300 bg-gradient-to-br from-lime-50 to-cream-50'
                    : 'border-warm-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-warm-900">{plan.name}</h3>
                  {plan.highlight && (
                    <span className="rounded-sm bg-lime-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-lime-800">
                      Most popular
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-warm-600">{plan.tagline}</p>
                <p className="mt-4">
                  <span className="text-3xl font-semibold text-warm-900">{plan.price}</span>
                  <span className="ml-1 text-sm text-warm-500">{plan.cadence}</span>
                </p>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-warm-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-700" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/portal/signup?plan=${plan.id}`}
                  className={`mt-6 block rounded-sm px-4 py-2.5 text-center text-sm font-medium ${
                    plan.highlight
                      ? 'bg-warm-900 text-white hover:bg-warm-800'
                      : 'border border-warm-300 bg-white text-warm-900 hover:border-warm-400'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-warm-500">
            Need more than 10 locations or custom integrations?{' '}
            <a href="mailto:hello@urbansimple.net" className="text-ocean-600 hover:underline">
              Talk to us
            </a>
            .
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 lg:py-24 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-warm-900 sm:text-4xl">
          Stop running ops out of group texts.
        </h2>
        <p className="mt-4 text-base text-warm-600">
          Get your team set up in under 60 seconds. Try it free for 14 days.
        </p>
        <Link
          href="/portal/signup"
          className="mt-6 inline-flex items-center gap-1.5 rounded-sm bg-warm-900 px-6 py-3 text-sm font-medium text-white hover:bg-warm-800"
        >
          Start your free trial
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-warm-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row">
          <p className="text-xs text-warm-500">
            &copy; {new Date().getFullYear()} Urban Simple LLC · Austin, TX
          </p>
          <div className="flex items-center gap-4 text-xs text-warm-500">
            <Link href="/portal/login" className="hover:text-ocean-600">
              Sign in
            </Link>
            <Link href="/privacy" className="hover:text-ocean-600">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ocean-600">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
