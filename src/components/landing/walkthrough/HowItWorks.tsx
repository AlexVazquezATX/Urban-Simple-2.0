const steps = [
  {
    number: '01',
    title: 'Fill out the form.',
    body: 'Takes 90 seconds.',
  },
  {
    number: '02',
    title: 'We confirm by email right away.',
    body: 'A phone call from Alex follows during business hours.',
  },
  {
    number: '03',
    title: 'Free walkthrough.',
    body: 'No obligation, no pressure, written quote within 48 hours.',
  },
]

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-heading" className="bg-cream-100 py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-bronze-600">
            How it works
          </p>
          <h2
            id="how-it-works-heading"
            className="font-display text-3xl font-semibold leading-tight tracking-tight text-charcoal-900 sm:text-4xl lg:text-5xl"
          >
            Three steps to a clean handoff.
          </h2>
        </div>

        <ol className="grid gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.number}
              className="rounded-2xl border border-cream-200 bg-white p-6 shadow-soft"
            >
              <span className="font-display text-4xl font-semibold text-bronze-500">
                {step.number}
              </span>
              <h3 className="mt-3 font-display text-xl font-semibold text-charcoal-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
