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
  // realRole gates the role-switcher: only the actual SUPER_ADMIN account
  // gets the dev tool, even while they're impersonating a different role.
  const [realRole, setRealRole] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('user-real-role')
    }
    return null
  })
  const [impersonating, setImpersonating] = useState(false)
  const [impersonatedClientId, setImpersonatedClientId] = useState<string | null>(null)
  const isSuperAdmin = realRole === 'SUPER_ADMIN'
  // Tasks is an owner/admin tool — managers and associates never see the
  // Tasks shortcuts in the mobile chrome (matches the sidebar + middleware).
  const canUseTasks = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN'

  // Track if initial auth check has completed
  const hasCheckedAuth = useRef(false)

  // Only check if current path is login page
  useEffect(() => {
    const isLogin = pathname === '/login' || pathname === '/app/login'
    setIsLoginPage(isLogin)
  }, [pathname])

  // ⌘K is owned by the sidebar's jump-to palette (app-sidebar.tsx); the
  // AI assistant opens via the gold FAB or the mobile bottom nav.

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

        // Always fetch /api/users/me on mount so impersonation state stays
        // fresh after a switch. Cheap (server-side cached per request) and
        // avoids stale-cache UI bugs that the previous sessionStorage-only
        // gate suffered from.
        const response = await fetch('/api/users/me', { credentials: 'include' })
        if (response.ok) {
          const userData = await response.json()
          setUserRole(userData.role)
          setRealRole(userData.realRole || userData.role)
          setImpersonating(!!userData.impersonating)
          setImpersonatedClientId(userData.impersonatedClientId || null)
          sessionStorage.setItem('user-role', userData.role)
          sessionStorage.setItem('user-real-role', userData.realRole || userData.role)
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
      <div data-shell="app" className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header - Only visible on mobile */}
          <header className="md:hidden sticky top-0 z-20 bg-sidebar border-b border-sidebar-border px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left: Menu trigger + Logo */}
              <div className="flex items-center gap-3">
                <SidebarTrigger className="h-10 w-10 flex items-center justify-center rounded-lg bg-secondary hover:bg-secondary/70 transition-colors" />
                <Link href="/dashboard" className="flex items-baseline gap-1">
                  <span className="font-display font-bold text-lg tracking-tight text-foreground">Urban</span>
                  <span className="font-display italic text-lg text-primary">Simple</span>
                </Link>
              </div>

              {/* Right: Quick actions — Tasks is owner/admin only */}
              {canUseTasks && (
                <div className="flex items-center gap-2">
                  <Link href="/tasks">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-lg"
                      title="Tasks"
                    >
                      <CheckSquare className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/tasks?new=true">
                    <Button
                      size="icon"
                      className="h-10 w-10 rounded-lg"
                      title="Add Task"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </header>

          {/* Desktop Header with Role Switcher — gated on REAL role so the
              dev tool stays visible even while impersonating a non-admin role. */}
          {userRole && isSuperAdmin && (
            <div className="hidden md:flex sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-6 py-3 justify-end">
              <RoleSwitcher
                currentRole={userRole}
                realRole={realRole || 'SUPER_ADMIN'}
                impersonating={impersonating}
                impersonatedClientId={impersonatedClientId}
              />
            </div>
          )}
          {/* Main content with bottom padding on mobile for nav bar */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto pb-24 md:pb-8">{children}</main>

          {/* Mobile Bottom Navigation */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-sidebar border-t border-sidebar-border px-2 py-2 safe-area-pb">
            <div className="flex items-center justify-around">
              <Link
                href="/dashboard"
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  pathname === '/dashboard'
                    ? 'text-primary bg-sidebar-accent'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="text-xs font-medium">Home</span>
              </Link>

              {canUseTasks && (
                <Link
                  href="/tasks"
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                    pathname === '/tasks' || pathname?.startsWith('/tasks/')
                      ? 'text-primary bg-sidebar-accent'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CheckSquare className="h-5 w-5" />
                  <span className="text-xs font-medium">Tasks</span>
                </Link>
              )}

              {/* Center Add Button — only for task users (owner/admin). For
                  everyone else the floating "+" would dead-end, so it's hidden
                  and the nav reads Home · AI · More. */}
              {canUseTasks && (
                <Link href="/tasks?new=true" className="-mt-6">
                  <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-card flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95">
                    <Plus className="h-7 w-7" />
                  </div>
                </Link>
              )}

              <button
                onClick={() => setIsAIChatOpen(true)}
                className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-xs font-medium">AI</span>
              </button>

              <SidebarTrigger className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                <Menu className="h-5 w-5" />
                <span className="text-xs font-medium">More</span>
              </SidebarTrigger>
            </div>
          </nav>
        </div>

        {/* AI assistant FAB — the restyled gold spark. 48px, bottom-right
            24px inset; soft shadow on light, gold hairline on dark. */}
        <Button
          onClick={() => setIsAIChatOpen(true)}
          size="icon"
          className="hidden md:flex fixed bottom-6 right-6 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-card dark:shadow-none dark:border dark:border-gold-400/25 hover:bg-primary/90 hover:-translate-y-0.5 transition-all duration-200 z-30 group"
          title="Open AI Assistant"
        >
          <Sparkles className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
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

