'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SidebarProvider, Sidebar, SidebarContent } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AIChatSidebar } from '@/features/ai/components/ai-chat-sidebar'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoginPage, setIsLoginPage] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)

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
      <div className="flex min-h-screen w-full bg-cream-50">
        <AppSidebar />
        <main className="flex-1 p-6 lg:p-8">{children}</main>

        {/* AI Chat Button - Floating with UrbanCognitive styling */}
        <Button
          onClick={() => setIsAIChatOpen(true)}
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-bronze-400 to-bronze-500 text-white shadow-glow hover:shadow-glow-lg hover:from-bronze-500 hover:to-bronze-600 hover:-translate-y-1 transition-all duration-300 z-30 group"
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

