import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Urban Simple Portal',
  description: 'Your cleaning service hub: see what we did, flag issues, stay inspection-ready.',
}

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  // The (portal) layout is intentionally bare — page-level layouts decide
  // whether to render the chrome (auth pages skip the nav). Mobile-first
  // styling lives in the page components.
  return <>{children}</>
}
