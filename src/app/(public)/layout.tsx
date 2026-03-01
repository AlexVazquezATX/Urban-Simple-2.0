'use client'

import { WalkthroughProvider } from '@/components/landing/walkthrough-context'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <WalkthroughProvider>{children}</WalkthroughProvider>
}
