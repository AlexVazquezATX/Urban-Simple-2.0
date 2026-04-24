import { LeadForm } from './LeadForm'

export function FinalCTA() {
  return (
    <section
      id="final-cta"
      aria-labelledby="final-cta-heading"
      className="bg-white py-16 lg:py-24"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2
            id="final-cta-heading"
            className="font-display text-3xl font-semibold leading-tight tracking-tight text-charcoal-900 sm:text-4xl lg:text-5xl"
          >
            Ready to see what a clean handoff looks like?
          </h2>
        </div>
        <LeadForm formId="lead-form-final" variant="final" />
      </div>
    </section>
  )
}
