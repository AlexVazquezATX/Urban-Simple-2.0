import Image from 'next/image'

const logos = [
  { src: '/images/Clients-1767818842/client-brand_Facebook-trans.png', alt: 'Meta (Facebook)' },
  { src: '/images/Clients-1767818842/client-brand_Kitchen-United-trans.png', alt: 'Kitchen United' },
  { src: '/images/Clients-1767818842/client-brand_Iron-Cactus-trans.png', alt: 'Iron Cactus' },
  { src: '/images/Clients-1767818842/client-brand_Wu-Chow-trans.png', alt: 'Wu Chow' },
  { src: '/images/Clients-1767818842/client-brand_Trulucks.png', alt: "Truluck's" },
  { src: '/images/Clients-1767818842/client-brand_Tarka.png', alt: 'Tarka' },
]

export function TrustBar() {
  const row = [...logos, ...logos]

  return (
    <section aria-label="Selected clients" className="border-b border-cream-200 bg-cream-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-charcoal-500">
          Trusted by Austin&apos;s hospitality leaders
        </p>
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-cream-50 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-cream-50 to-transparent z-10" />
          <div className="flex w-max animate-marquee items-center gap-12 py-1">
            {row.map((logo, i) => (
              <div key={`${logo.alt}-${i}`} className="relative h-10 w-32 shrink-0 sm:h-12 sm:w-40">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  fill
                  sizes="160px"
                  className="object-contain opacity-70 grayscale transition-all"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
