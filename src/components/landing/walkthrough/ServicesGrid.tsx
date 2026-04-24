import {
  Utensils,
  ChefHat,
  Moon,
  Droplets,
  Wind,
  Bath,
  BedDouble,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

const services: { label: string; icon: LucideIcon }[] = [
  { label: 'Dishwashing and pot wash', icon: Utensils },
  { label: 'Kitchen deep clean', icon: ChefHat },
  { label: 'Front of house nightly', icon: Moon },
  { label: 'Floor care (tile, grout, concrete)', icon: Droplets },
  { label: 'Hood and vent (through licensed partner)', icon: Wind },
  { label: 'Restroom program', icon: Bath },
  { label: 'Hotel housekeeping support', icon: BedDouble },
  { label: 'Back-of-house sanitization', icon: Sparkles },
]

export function ServicesGrid() {
  return (
    <section aria-labelledby="services-heading" className="bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-bronze-600">
            What we clean
          </p>
          <h2
            id="services-heading"
            className="font-display text-3xl font-semibold leading-tight tracking-tight text-charcoal-900 sm:text-4xl lg:text-5xl"
          >
            Full-program coverage for the venues we serve.
          </h2>
        </div>

        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {services.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="flex items-start gap-3 rounded-xl border border-cream-200 bg-cream-50 p-4 shadow-soft"
            >
              <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-bronze-100 text-bronze-700">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-sm font-medium text-charcoal-800">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
