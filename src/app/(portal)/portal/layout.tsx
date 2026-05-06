import Link from 'next/link'
import Image from 'next/image'
import { Home, Camera, AlertCircle, FileText, Users } from 'lucide-react'
import { requirePortalContext } from '@/lib/portal-auth'
import { LogoutButton } from '@/components/portal/logout-button'

// Portal shell: top header + bottom mobile nav + max-width content area.
// Mobile-first; on desktop, the same nav floats top-right.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePortalContext()

  return (
    <div className="min-h-screen bg-cream-50 text-charcoal-900 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-warm-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/portal" className="flex items-center gap-2.5">
            {ctx.client.logoUrl ? (
              <div className="relative h-8 w-8 overflow-hidden rounded-sm border border-warm-200 bg-white">
                <Image src={ctx.client.logoUrl} alt={ctx.client.name} fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-ocean-100 text-ocean-700 text-sm font-medium">
                {ctx.client.name.charAt(0)}
              </div>
            )}
            <div className="leading-tight">
              <p className="text-sm font-medium text-warm-900">{ctx.client.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-warm-500">Urban Simple Portal</p>
            </div>
          </Link>

          {/* Desktop nav (hidden on mobile; bottom bar takes over) */}
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link href="/portal" className="text-warm-600 hover:text-ocean-600">Home</Link>
            <Link href="/portal/walkthrough/new" className="text-warm-600 hover:text-ocean-600">Walkthrough</Link>
            <Link href="/portal/cleaning-log" className="text-warm-600 hover:text-ocean-600">Cleaning Log</Link>
            <Link href="/portal/issues" className="text-warm-600 hover:text-ocean-600">Issues</Link>
            <Link href="/portal/documents" className="text-warm-600 hover:text-ocean-600">Documents</Link>
            <Link href="/portal/team" className="text-warm-600 hover:text-ocean-600">Team</Link>
            <LogoutButton />
          </nav>

          {/* Mobile: avatar + logout */}
          <div className="md:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-warm-100 text-warm-700 text-xs font-medium">
              {ctx.firstName.charAt(0)}
              {ctx.lastName.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-4 md:pb-8">
        {children}
      </main>

      {/* Mobile bottom nav — featured walkthrough is the centered call-to-action */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-warm-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-5 text-[10px] uppercase tracking-wider">
          <Link href="/portal" className="flex flex-col items-center gap-1 py-2.5 text-warm-600">
            <Home className="h-5 w-5" />
            Home
          </Link>
          <Link href="/portal/issues" className="flex flex-col items-center gap-1 py-2.5 text-warm-600">
            <AlertCircle className="h-5 w-5" />
            Issues
          </Link>
          <Link
            href="/portal/walkthrough/new"
            className="flex flex-col items-center gap-1 py-2 text-lime-700 font-medium"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-lime-100">
              <Camera className="h-5 w-5" />
            </span>
            Walk
          </Link>
          <Link href="/portal/documents" className="flex flex-col items-center gap-1 py-2.5 text-warm-600">
            <FileText className="h-5 w-5" />
            Docs
          </Link>
          <Link href="/portal/team" className="flex flex-col items-center gap-1 py-2.5 text-warm-600">
            <Users className="h-5 w-5" />
            Team
          </Link>
        </div>
      </nav>
    </div>
  )
}
