'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LogoutButton } from '@/components/portal/logout-button'

// Sticky top bar for inner portal pages (spec: LiveNav in usp-live-core.jsx).
// Brand circle + client name + mono URBAN SIMPLE PORTAL, underline-active
// links, Sign out right. The home page renders its own inline nav inside the
// split layout, so this hides itself on /portal exactly.

const LINKS: Array<{ href: string; label: string; match: string }> = [
  { href: '/portal', label: 'Home', match: '/portal' },
  { href: '/portal/walkthrough/new', label: 'Walkthrough', match: '/portal/walkthrough/new' },
  { href: '/portal/walkthroughs', label: 'Walkthroughs', match: '/portal/walkthroughs' },
  { href: '/portal/cleaning-log', label: 'Cleaning log', match: '/portal/cleaning-log' },
  { href: '/portal/issues', label: 'Issues', match: '/portal/issues' },
  { href: '/portal/requests', label: 'Requests', match: '/portal/requests' },
  { href: '/portal/documents', label: 'Documents', match: '/portal/documents' },
  { href: '/portal/team', label: 'Team', match: '/portal/team' },
  { href: '/portal/alerts', label: 'Alerts', match: '/portal/alerts' },
]

export function LiveNav({
  clientName,
  logoUrl,
  isSelfServe,
}: {
  clientName: string
  logoUrl: string | null
  isSelfServe?: boolean
}) {
  const pathname = usePathname()

  // Home uses the inline nav inside its photo-split layout.
  if (pathname === '/portal') return null

  // Service requests are for Urban Simple cleaning clients only.
  const links = isSelfServe ? LINKS.filter(l => l.href !== '/portal/requests') : LINKS

  const isActive = (match: string) =>
    match === '/portal' ? pathname === '/portal' : pathname.startsWith(match)

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-border bg-cream-50/95 px-5 py-3.5 backdrop-blur md:px-12 md:py-4 xl:flex-nowrap xl:gap-6">
      <Link href="/portal" className="flex shrink-0 items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-gold-600/30 bg-gold-600/10 font-display text-[13.5px] font-extrabold text-gold-600">
          {logoUrl ? (
            <div className="relative h-full w-full">
              <Image src={logoUrl} alt={clientName} fill className="object-cover" unoptimized />
            </div>
          ) : (
            clientName.charAt(0)
          )}
        </div>
        <div className="leading-[1.1]">
          <div className="font-display text-[14.5px] font-bold tracking-[-0.2px] text-foreground">
            {clientName}
          </div>
          <div className="font-mono text-[8.5px] uppercase tracking-[1.6px] text-muted-foreground">
            Urban Simple Portal
          </div>
        </div>
      </Link>

      {/* Below xl the nine links don't fit beside the brand, so they get their
          own row under it (scrolling sideways only on phones). */}
      <nav className="order-last flex min-w-0 basis-full gap-5 overflow-x-auto pb-1 md:gap-[22px] xl:order-none xl:ml-4 xl:flex-1 xl:basis-auto xl:pb-0">
        {links.map(({ href, label, match }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              '-mb-1.5 whitespace-nowrap border-b-2 pb-1 text-[13.5px]',
              isActive(match)
                ? 'border-gold-600 font-semibold text-foreground'
                : 'border-transparent font-normal text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto shrink-0 xl:ml-0">
        <LogoutButton />
      </div>
    </div>
  )
}
