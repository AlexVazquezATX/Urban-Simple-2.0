'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AIChatSidebar } from '@/features/ai/components/ai-chat-sidebar'
import { RoleSwitcher } from '@/components/layout/role-switcher'
import { Button } from '@/components/ui/button'
import { Sparkles, Plus, LayoutDashboard, CheckSquare, Menu } from 'lucide-react'

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
          {/* Mobile Header - Only visible on mobile */}
          <header className="md:hidden sticky top-0 z-20 bg-white border-b border-cream-200 px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left: Menu trigger + Logo */}
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-10 w-10 flex items-center justify-center rounded-lg bg-charcoal-100 hover:bg-charcoal-200 transition-colors" />
                <Link href="/dashboard" className="flex items-baseline gap-1">
                  <span className="font-bold text-lg tracking-tight text-charcoal-900">Urban</span>
                  <span className="font-display italic text-lg text-bronze-600">Simple</span>
                </Link>
              </div>

              {/* Right: Quick actions */}
              <div className="flex items-center gap-2">
                <Link href="/tasks">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-lg"
                    title="Tasks"
                  >
                    <CheckSquare className="h-5 w-5 text-charcoal-600" />
                  </Button>
                </Link>
                <Link href="/tasks?new=true">
                  <Button
                    size="icon"
                    className="h-10 w-10 rounded-lg bg-ocean-500 hover:bg-ocean-600 text-white"
                    title="Add Task"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          {/* Desktop Header with Role Switcher */}
          {userRole && isSuperAdmin && (
            <div className="hidden md:flex sticky top-0 z-10 bg-white border-b border-cream-200 px-6 py-3 justify-end">
              <RoleSwitcher currentRole={userRole} isSuperAdmin={isSuperAdmin} />
            </div>
          )}
          {/* Main content with bottom padding on mobile for nav bar */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto pb-24 md:pb-8">{children}</main>

          {/* Mobile Bottom Navigation */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-cream-200 px-2 py-2 safe-area-pb">
            <div className="flex items-center justify-around">
              <Link
                href="/dashboard"
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  pathname === '/dashboard'
                    ? 'text-ocean-600 bg-ocean-50'
                    : 'text-charcoal-500 hover:text-charcoal-700'
                }`}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-xs font-medium">Home</span>
              </Link>

              <Link
                href="/tasks"
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  pathname === '/tasks' || pathname?.startsWith('/tasks/')
                    ? 'text-ocean-600 bg-ocean-50'
                    : 'text-charcoal-500 hover:text-charcoal-700'
                }`}
              >
                <CheckSquare className="h-5 w-5" />
                <span className="text-xs font-medium">Tasks</span>
              </Link>

              {/* Center Add Button */}
              <Link href="/tasks?new=true" className="-mt-6">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-600 text-white shadow-lg flex items-center justify-center hover:from-ocean-600 hover:to-ocean-700 transition-all active:scale-95">
                  <Plus className="h-7 w-7" />
                </div>
              </Link>

              <button
                onClick={() => setIsAIChatOpen(true)}
                className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-charcoal-500 hover:text-charcoal-700 transition-colors"
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-xs font-medium">AI</span>
              </button>

              <SidebarTrigger className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-charcoal-500 hover:text-charcoal-700 transition-colors">
                <Menu className="h-5 w-5" />
                <span className="text-xs font-medium">More</span>
              </SidebarTrigger>
            </div>
          </nav>
        </div>

        {/* AI Chat Button - Desktop only (mobile uses bottom nav) */}
        <Button
          onClick={() => setIsAIChatOpen(true)}
          size="lg"
          className="hidden md:flex fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-600 text-white shadow-glow hover:shadow-glow-lg hover:from-ocean-600 hover:to-ocean-700 hover:-translate-y-1 transition-all duration-300 z-30 group"
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

