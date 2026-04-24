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
        className="flex min-h-[48px] items-center justify-center rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-700 px-5 py-3 text-center text-base font-semibold text-white shadow-lg transition-all hover:from-ocean-600 hover:to-ocean-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean-300"
      >
        Book a free walkthrough
      </a>
    </div>
  )
}
