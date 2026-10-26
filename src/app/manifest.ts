import type { MetadataRoute } from 'next'

// Makes the app installable ("Add to Home Screen"): crew and clients get an
// icon that opens full screen, no browser bar. Signed-in clients land on
// /dashboard and middleware sends them on to /portal.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Urban Simple',
    short_name: 'Urban Simple',
    description: 'Nightly routes, checklists and service updates for the Urban Simple team and clients.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#faf6ec',
    theme_color: '#1f1c19',
    icons: [
      { src: '/app-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/app-icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/app-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
