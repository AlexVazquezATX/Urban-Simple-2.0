import type { Metadata } from 'next'
import '../globals.css'
import { PortalLightMode } from '@/components/portal/portal-light-mode'

export const metadata: Metadata = {
  title: 'Urban Simple Portal',
  description: 'Your cleaning service hub: see what we did, flag issues, stay inspection-ready.',
}

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  // The (portal) layout is intentionally bare — page-level layouts decide
  // whether to render the chrome (auth pages skip the nav).
  // PortalLightMode strips the admin's `.dark` class so the portal always
  // renders light — it's the softer, light-only voice of the brand.
  return (
    <>
      <PortalLightMode />
      {children}
    </>
  )
}
