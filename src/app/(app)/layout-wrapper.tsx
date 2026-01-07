'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AIChatSidebar } from '@/features/ai/components/ai-chat-sidebar'
import { RoleSwitcher } from '@/components/layout/role-switcher'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoginPage, setIsLoginPage] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(() => {
    // Load cached role from sessionStorage on initial render
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('user-role')
    }
    return null
  })
  const [isSuperAdmin, setIsSuperAdmin] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('user-role') === 'SUPER_ADMIN'
    }
    return false
  })
  
  // Track if initial auth check has completed
  const hasCheckedAuth = useRef(false)

  // Only check if current path is login page
  useEffect(() => {
    const isLogin = pathname === '/login' || pathname === '/app/login'
    setIsLoginPage(isLogin)
  }, [pathname])

  // Auth check runs only once on mount
  useEffect(() => {
    if (hasCheckedAuth.current) return
    
    const checkAuth = async () => {
      const isLogin = pathname === '/login' || pathname === '/app/login'
      
      if (isLogin) {
        setIsCheckingAuth(false)
        return
      }

      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        // Only fetch role if not cached
        if (!userRole) {
          const response = await fetch('/api/users/me', { credentials: 'include' })
          if (response.ok) {
            const userData = await response.json()
            setUserRole(userData.role)
            setIsSuperAdmin(userData.role === 'SUPER_ADMIN')
            // Cache in sessionStorage
            sessionStorage.setItem('user-role', userData.role)
          }
        }
        
        hasCheckedAuth.current = true
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/login')
        return
      }
      
      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [pathname, router, userRole])

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
      <div className="flex min-h-screen w-full bg-cream-50">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header with Role Switcher */}
          {userRole && isSuperAdmin && (
            <div className="sticky top-0 z-10 bg-white border-b border-cream-200 px-6 py-3 flex justify-end">
              <RoleSwitcher currentRole={userRole} isSuperAdmin={isSuperAdmin} />
            </div>
          )}
          <main className="flex-1 p-6 lg:p-8 overflow-auto">{children}</main>
        </div>

        {/* AI Chat Button - Floating with UrbanCognitive styling */}
        <Button
          onClick={() => setIsAIChatOpen(true)}
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-600 text-white shadow-glow hover:shadow-glow-lg hover:from-ocean-600 hover:to-ocean-700 hover:-translate-y-1 transition-all duration-300 z-30 group"
          title="Open AI Assistant"
        >
          <Sparkles className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" />
        </Button>

        {/* AI Chat Sidebar */}
        <AIChatSidebar
          isOpen={isAIChatOpen}
          onClose={() => setIsAIChatOpen(false)}
        />
      </div>
    </SidebarProvider>
  )
}

