'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StudioNav } from '@/components/studio/studio-nav'

const PUBLIC_PATHS = ['/studio/login', '/studio/signup', '/studio/forgot-password', '/studio/reset-password', '/studio/terms', '/studio/privacy']

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const hasChecked = useRef(false)

  const isPublicPage = PUBLIC_PATHS.includes(pathname)

  useEffect(() => {
    if (isPublicPage) {
      setIsChecking(false)
      return
    }

    if (hasChecked.current) return

    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/studio/login')
          return
        }

        hasChecked.current = true
      } catch {
        router.push('/studio/login')
        return
      }
      setIsChecking(false)
    }

    checkAuth()
  }, [pathname, router, isPublicPage])

  // Public pages (login, signup) render without nav
  if (isPublicPage) {
    return <>{children}</>
  }

  // Loading state while checking auth
  if (isChecking) {
    return null
  }

  return (
    <div className="min-h-screen bg-warm-50">
      <StudioNav />
      <main className="max-w-7xl mx-auto">{children}</main>
    </div>
  )
}
