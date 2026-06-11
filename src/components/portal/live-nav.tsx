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
  { href: '/portal/walkthrough/new', label: 'Walkthrough', match: '/portal/walkthrough' },
  { href: '/portal/cleaning-log', label: 'Cleaning log', match: '/portal/cleaning-log' },
  { href: '/portal/issues', label: 'Issues', match: '/portal/issues' },
  { href: '/portal/documents', label: 'Documents', match: '/portal/documents' },
  { href: '/portal/team', label: 'Team', match: '/portal/team' },
]

export function LiveNav({
  clientName,
  logoUrl,
}: {
  clientName: string
  logoUrl: string | null
}) {
  const pathname = usePathname()

  // Home uses the inline nav inside its photo-split layout.
  if (pathname === '/portal') return null

  const isActive = (match: string) =>
    match === '/portal' ? pathname === '/portal' : pathname.startsWith(match)

  return (
    <div className="sticky top-0 z-20 flex items-center gap-5 border-b border-border bg-cream-50/95 px-5 py-4 backdrop-blur md:gap-6 md:px-12">
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

      <nav className="flex min-w-0 flex-1 gap-5 overflow-x-auto md:ml-4 md:gap-[22px]">
        {LINKS.map(({ href, label, match }) => (
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

      <div className="shrink-0">
        <LogoutButton />
      </div>
    </div>
  )
}
