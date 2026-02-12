import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BackHaus — AI Food Photography & Branded Content for Restaurants',
  description:
    'Transform your restaurant marketing with AI-powered food photography, branded social posts, and content that drives customers through your doors.',
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
