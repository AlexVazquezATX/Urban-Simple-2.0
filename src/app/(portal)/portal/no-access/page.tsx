import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPortalContext } from '@/lib/portal-auth'
import { LivePhotoPanel } from '@/components/portal/live-shell'
import { LogoutButton } from '@/components/portal/logout-button'

// Landing spot for a signed-in user whose login isn't linked to a client
// portal (no CLIENT_USER role, or no ClientContact link). Sending them to
// /portal/login would bounce straight back to /portal, so they land here.
export default async function PortalNoAccessPage() {
  const ctx = await getPortalContext()
  if (ctx) redirect('/portal')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/portal/login')

  return (
    <div className="flex min-h-screen w-full bg-cream-50 font-sans text-foreground">
      <LivePhotoPanel
        photoUrl={null}
        photoAlt="Your kitchen at its best"
        brandName="Urban Simple"
        pill="We clean while you sleep"
      />

      <div className="flex min-w-0 flex-1 flex-col justify-center px-7 py-14 sm:px-[clamp(48px,7vw,120px)]">
        <div className="w-full max-w-[420px]">
          <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[2.4px] text-gold-600">
            Urban Simple · Client Portal
          </div>
          <h1 className="font-display text-[36px] font-bold leading-[1.06] tracking-[-1.1px] text-foreground">
            Your account isn&apos;t linked to a client portal.
          </h1>
          <p className="mt-3.5 text-[15px] leading-relaxed text-cream-700">
            You&apos;re signed in{user.email ? ` as ${user.email}` : ''}, but this login
            isn&apos;t connected to a client account yet. If you think that&apos;s a
            mistake, email us and we&apos;ll get you set up.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="mailto:hello@urbansimple.net?subject=Portal%20access"
              className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Email hello@urbansimple.net
            </a>
            <LogoutButton className="h-12 justify-center rounded-full border border-border px-6 text-[14px] font-semibold text-foreground hover:bg-secondary/60" />
          </div>

          <div className="mt-14 border-t border-border pt-5 font-mono text-[10px] uppercase tracking-[1.8px] text-muted-foreground">
            Urban Simple · We clean while you sleep
          </div>
        </div>
      </div>
    </div>
  )
}
