'use client'

import { useEffect } from 'react'

// The portal is light-only — the softer voice of the brand. The admin app
// toggles dark mode by adding `.dark` to <html> (see use-dark-mode.ts), and
// that class would otherwise leak into /portal/* for a SUPER_ADMIN who
// impersonates a client while in dark mode. This strips it on mount and
// restores the saved admin preference on unmount, so dark: variants never
// apply inside the portal.
const DARK_MODE_KEY = 'urbansimple-dark-mode'

export function PortalLightMode() {
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark')
    return () => {
      // Leaving the portal: re-apply the admin's saved preference.
      if (localStorage.getItem(DARK_MODE_KEY) === 'true') {
        root.classList.add('dark')
      }
    }
  }, [])

  return null
}
