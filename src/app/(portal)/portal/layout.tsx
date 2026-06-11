import { getPortalContext } from '@/lib/portal-auth'
import { LiveNav } from '@/components/portal/live-nav'
import { ImpersonationExitPill } from '@/components/portal/impersonation-exit-pill'

// Portal shell: light-only cream-50 surface with the sticky LiveNav top bar
// (client logo + underline-active links, NO sidebar, no admin FAB). The home
// page renders its own inline nav inside the photo-split layout, so LiveNav
// hides itself on /portal exactly.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getPortalContext()

  // Public auth pages (/portal/login, /portal/signup) have no portal context —
  // they render bare, full-bleed. Every authed page enforces its own access
  // via requirePortalContext(), and middleware bounces unauthenticated users
  // off protected /portal/* routes.
  if (!ctx) {
    return <>{children}</>
  }

  return (
    <div
      data-shell="portal"
      className="flex min-h-screen w-full flex-col bg-cream-50 font-sans text-foreground"
    >
      <LiveNav clientName={ctx.client.name} logoUrl={ctx.client.logoUrl} />

      <main className="flex w-full flex-1 flex-col">{children}</main>

      {ctx.impersonating && <ImpersonationExitPill clientName={ctx.client.name} />}
    </div>
  )
}
