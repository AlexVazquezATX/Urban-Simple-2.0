'use client'

export function StickyMobileCTA() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const target = document.getElementById('walkthrough-form')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="safe-area-pb fixed inset-x-0 bottom-0 z-40 border-t border-cream-200 bg-white/95 px-4 py-3 shadow-elevated backdrop-blur md:hidden">
      <a
        href="#walkthrough-form"
        onClick={handleClick}
        className="flex min-h-[48px] items-center justify-center rounded-lg bg-charcoal-900 px-5 py-3 text-center text-base font-semibold text-cream-50 transition-colors hover:bg-charcoal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze-500"
      >
        Book a free walkthrough
      </a>
    </div>
  )
}
