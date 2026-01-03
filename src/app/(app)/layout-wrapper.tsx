'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SidebarProvider, Sidebar, SidebarContent } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoginPage, setIsLoginPage] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const isLogin = pathname === '/login' || pathname === '/app/login'
      setIsLoginPage(isLogin)

      // If not on login page, check if user is authenticated
      if (!isLogin) {
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          
          if (!user) {
            router.push('/login')
            return
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          router.push('/login')
          return
        }
      }
      
      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [pathname, router])

  // Show nothing while checking auth (prevents flash)
  if (isCheckingAuth && !isLoginPage) {
    return null
  }

  // Login page doesn't need sidebar
  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </SidebarProvider>
  )
}

