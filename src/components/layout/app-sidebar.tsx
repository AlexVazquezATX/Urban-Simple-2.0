'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  MessageSquare,
  BarChart3,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function AppSidebar() {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/clients', icon: Users, label: 'Clients' },
    { href: '/invoices', icon: FileText, label: 'Invoices' },
    { href: '/billing', icon: DollarSign, label: 'Billing & AR' },
    { href: '/chat', icon: MessageSquare, label: 'Team Chat' },
  ]

  const adminItems = [
    { href: '/chat-analytics', icon: BarChart3, label: 'Chat Analytics' },
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname?.startsWith(href)
  }

  return (
    <Sidebar className="border-r border-cream-300 bg-gradient-to-b from-cream-50 to-cream-100">
      <SidebarHeader className="border-b border-cream-300 p-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-2xl tracking-tight text-charcoal-900">
              Urban
            </span>
            <span className="font-display italic font-normal text-2xl text-bronze-600">
              Simple
            </span>
          </div>
          <p className="text-xs text-charcoal-500 tracking-wide uppercase font-medium">
            Business Management
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold uppercase tracking-widest text-charcoal-400 px-3 mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        'h-11 px-3 rounded-xl transition-all duration-200 group',
                        active
                          ? 'bg-gradient-to-br from-bronze-400 to-bronze-500 text-white shadow-md hover:shadow-lg hover:from-bronze-500 hover:to-bronze-600'
                          : 'text-charcoal-700 hover:bg-gradient-to-br hover:from-cream-100 hover:to-ocean-50 hover:text-ocean-700 hover:border-ocean-200'
                      )}
                    >
                      <a href={item.href} className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            'h-5 w-5 transition-transform duration-200',
                            active
                              ? 'text-white'
                              : 'text-charcoal-500 group-hover:text-ocean-600 group-hover:scale-110'
                          )}
                        />
                        <span className="font-medium text-sm">{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs font-bold uppercase tracking-widest text-charcoal-400 px-3 mb-2">
            Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {adminItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        'h-11 px-3 rounded-xl transition-all duration-200 group',
                        active
                          ? 'bg-gradient-to-br from-ocean-500 to-ocean-600 text-white shadow-md hover:shadow-lg hover:from-ocean-600 hover:to-ocean-700'
                          : 'text-charcoal-700 hover:bg-gradient-to-br hover:from-cream-100 hover:to-ocean-50 hover:text-ocean-700 hover:border-ocean-200'
                      )}
                    >
                      <a href={item.href} className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            'h-5 w-5 transition-transform duration-200',
                            active
                              ? 'text-white'
                              : 'text-charcoal-500 group-hover:text-ocean-600 group-hover:scale-110'
                          )}
                        />
                        <span className="font-medium text-sm">{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-cream-300 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="h-11 px-3 rounded-xl text-charcoal-700 hover:bg-status-error-light hover:text-status-error transition-all duration-200 group"
            >
              <LogOut className="h-5 w-5 text-charcoal-500 group-hover:text-status-error transition-colors" />
              <span className="font-medium text-sm">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
