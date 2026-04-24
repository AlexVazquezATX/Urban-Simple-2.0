import { ClipboardCheck, HeartHandshake, Users, TrendingUp } from 'lucide-react'

const cards = [
  {
    icon: ClipboardCheck,
    title: 'Food and beverage is all we do.',
    body: 'We know what a hood vent looks like at 4am. We know what health inspectors flag.',
    accent: 'bronze',
  },
  {
    icon: HeartHandshake,
    title: 'Operator to operator.',
    body: 'Alex and Demian ran venues before they ran a cleaning company. You get someone who has been in your kitchen at 2am, not a sales rep.',
    accent: 'terracotta',
  },
  {
    icon: Users,
    title: 'Managers on the ground.',
    body: 'Julio and Yoifranger walk every location. You get one escalation point and it is not a call center.',
    accent: 'ocean',
  },
  {
    icon: TrendingUp,
    title: 'Built to scale with you.',
    body: 'Whether you are one café or a hotel group, the team, the systems, and the reporting scale cleanly.',
    accent: 'sage',
  },
] as const

const accentClasses: Record<(typeof cards)[number]['accent'], string> = {
  bronze: 'bg-bronze-100 text-bronze-700',
  terracotta: 'bg-terracotta-100 text-terracotta-700',
  ocean: 'bg-ocean-100 text-ocean-700',
  sage: 'bg-sage-100 text-sage-700',
}

export function WhyUrbanSimple() {
  return (
    <section aria-labelledby="why-heading" className="bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-bronze-600">
            Why Urban Simple
          </p>
          <h2
            id="why-heading"
            className="font-display text-3xl font-semibold leading-tight tracking-tight text-charcoal-900 sm:text-4xl lg:text-5xl"
          >
            Built for the venues that cannot afford to open dirty.
          </h2>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ icon: Icon, title, body, accent }) => (
            <li
              key={title}
              className="flex h-full flex-col rounded-2xl border border-cream-200 bg-gradient-card p-6 shadow-soft"
            >
              <span
                className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${accentClasses[accent]}`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="font-display text-lg font-semibold text-charcoal-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-600">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
