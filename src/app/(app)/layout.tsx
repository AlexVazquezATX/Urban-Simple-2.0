import { LayoutWrapper } from './layout-wrapper'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Always render LayoutWrapper - it will handle login page detection and auth client-side
  // This prevents server-side errors from blocking any pages
  return <LayoutWrapper>{children}</LayoutWrapper>
}



