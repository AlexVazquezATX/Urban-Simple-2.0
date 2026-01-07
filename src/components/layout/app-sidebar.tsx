'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
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
  ClipboardList,
  Calendar,
  UserCheck,
  Building2,
  UserCog,
  ChevronDown,
  ChevronRight,
  Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function AppSidebar() {
  const router = useRouter()
  const pathname = usePathname()

  // Collapsible state for each category
  const [isAdminOpen, setIsAdminOpen] = useState(true)
  const [isOperationsOpen, setIsOperationsOpen] = useState(true)
  const [isClientRelationsOpen, setIsClientRelationsOpen] = useState(true)
  const [isAdministrativeOpen, setIsAdministrativeOpen] = useState(true)

  // User role state
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    // Fetch user role
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/users/me', { credentials: 'include' })
        if (response.ok) {
          const userData = await response.json()
          setUserRole(userData.role)
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error)
      }
    }
    fetchUserRole()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Helper to check if user has access to a feature
  const hasAccess = (roles: string[]) => {
    if (!userRole) return false
    return roles.includes(userRole)
  }

  const adminItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE', 'CLIENT_USER'] },
    { href: '/chat-analytics', icon: BarChart3, label: 'Chat Analytics', roles: ['SUPER_ADMIN', 'ADMIN'] },
  ]

  const operationsItems = [
    { href: '/operations', icon: ClipboardList, label: 'Operations', exact: true, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { href: '/operations/nightly-reviews', icon: Moon, label: 'Nightly Reviews', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { href: '/chat', icon: MessageSquare, label: 'Team Chat', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE'] },
    { href: '/team', icon: UserCog, label: 'Team', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { href: '/operations/schedule', icon: Calendar, label: 'Schedule', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { href: '/operations/assignments', icon: UserCheck, label: 'Assignments', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE'] },
    { href: '/operations/checklists', icon: ClipboardList, label: 'Checklists', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE'] },
  ]

  const clientRelationsItems = [
    { href: '/clients', icon: Users, label: 'Clients', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
    { href: '/locations', icon: Building2, label: 'Locations', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
  ]

  const administrativeItems = [
    { href: '/billing', icon: DollarSign, label: 'Billing & AR', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { href: '/invoices', icon: FileText, label: 'Invoices', roles: ['SUPER_ADMIN', 'ADMIN'] },
  ]

  const isActive = (href: string, exact?: boolean) => {
    if (href === '/') {
      return pathname === '/'
    }
    if (exact) {
      return pathname === href
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
        {/* Admin Tools */}
        {adminItems.filter((item) => hasAccess(item.roles)).length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel
            className="text-xs font-bold uppercase tracking-widest text-charcoal-400 px-3 mb-2 cursor-pointer hover:text-charcoal-600 transition-colors flex items-center justify-between"
            onClick={() => setIsAdminOpen(!isAdminOpen)}
          >
            <span>Admin Tools</span>
            {isAdminOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </SidebarGroupLabel>
          {isAdminOpen && (
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {adminItems.filter((item) => hasAccess(item.roles)).map((item) => {
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
          )}
        </SidebarGroup>
        )}

        {/* Operations */}
        {operationsItems.filter((item) => hasAccess(item.roles)).length > 0 && (
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel
            className="text-xs font-bold uppercase tracking-widest text-charcoal-400 px-3 mb-2 cursor-pointer hover:text-charcoal-600 transition-colors flex items-center justify-between"
            onClick={() => setIsOperationsOpen(!isOperationsOpen)}
          >
            <span>Operations</span>
            {isOperationsOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </SidebarGroupLabel>
          {isOperationsOpen && (
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {operationsItems.filter((item) => hasAccess(item.roles)).map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href, item.exact)

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
          )}
        </SidebarGroup>
        )}

        {/* Client Relations */}
        {clientRelationsItems.filter((item) => hasAccess(item.roles)).length > 0 && (
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel
            className="text-xs font-bold uppercase tracking-widest text-charcoal-400 px-3 mb-2 cursor-pointer hover:text-charcoal-600 transition-colors flex items-center justify-between"
            onClick={() => setIsClientRelationsOpen(!isClientRelationsOpen)}
          >
            <span>Client Relations</span>
            {isClientRelationsOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </SidebarGroupLabel>
          {isClientRelationsOpen && (
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {clientRelationsItems.filter((item) => hasAccess(item.roles)).map((item) => {
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
          )}
        </SidebarGroup>
        )}

        {/* Administrative */}
        {administrativeItems.filter((item) => hasAccess(item.roles)).length > 0 && (
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel
            className="text-xs font-bold uppercase tracking-widest text-charcoal-400 px-3 mb-2 cursor-pointer hover:text-charcoal-600 transition-colors flex items-center justify-between"
            onClick={() => setIsAdministrativeOpen(!isAdministrativeOpen)}
          >
            <span>Administrative</span>
            {isAdministrativeOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </SidebarGroupLabel>
          {isAdministrativeOpen && (
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {administrativeItems.filter((item) => hasAccess(item.roles)).map((item) => {
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
          )}
        </SidebarGroup>
        )}
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
