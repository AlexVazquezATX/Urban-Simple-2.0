'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useCallback } from 'react'
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
  Rocket,
  Search,
  Mail,
  TrendingUp,
  Sunrise,
  Sparkles,
  Palette,
  CheckSquare,
  AtSign,
  Camera,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Storage key for sidebar state
const SIDEBAR_STATE_KEY = 'urbansimple-sidebar-state'

interface SidebarState {
  admin: boolean
  operations: boolean
  clientRelations: boolean
  growth: boolean
  administrative: boolean
  backhausAdmin: boolean
}

function loadSidebarState(): SidebarState {
  if (typeof window === 'undefined') {
    return { admin: true, operations: true, clientRelations: true, growth: true, administrative: true, backhausAdmin: true }
  }
  try {
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Ignore parse errors
  }
  return { admin: true, operations: true, clientRelations: true, growth: true, administrative: true, backhausAdmin: true }
}

function saveSidebarState(state: SidebarState) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(state))
  }
}

export function AppSidebar() {
  const router = useRouter()
  const pathname = usePathname()

  // Load initial state from localStorage
  const [sidebarState, setSidebarState] = useState<SidebarState>(() => loadSidebarState())

  // User role state - cached to avoid refetching
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('user-role')
    }
    return null
  })

  // Toggle handlers that persist state
  const toggleSection = useCallback((section: keyof SidebarState) => {
    setSidebarState(prev => {
      const newState = { ...prev, [section]: !prev[section] }
      saveSidebarState(newState)
      return newState
    })
  }, [])

  useEffect(() => {
    // Only fetch if we don't have the role cached
    if (userRole) return

    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/users/me', { credentials: 'include' })
        if (response.ok) {
          const userData = await response.json()
          setUserRole(userData.role)
          // Cache in sessionStorage
          sessionStorage.setItem('user-role', userData.role)
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error)
      }
    }
    fetchUserRole()
  }, [userRole])

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
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE', 'CLIENT_USER'] },
    { href: '/tasks', icon: CheckSquare, label: 'Tasks', roles: ['SUPER_ADMIN'] },
    { href: '/dashboard/blog', icon: Sparkles, label: 'Blog', roles: ['SUPER_ADMIN'] },
    { href: '/pulse', icon: Sunrise, label: 'Pulse', roles: ['SUPER_ADMIN'] },
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

  const growthItems = [
    { href: '/growth', icon: Rocket, label: 'Daily Planner', exact: true, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { href: '/creative-hub', icon: Palette, label: 'Creative Hub', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { href: '/growth/outreach', icon: Mail, label: 'Outreach', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { href: '/growth/prospects', icon: Users, label: 'Prospects', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { href: '/growth/email-finder', icon: AtSign, label: 'Email Finder', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { href: '/growth/discovery', icon: Search, label: 'AI Discovery', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { href: '/growth/pipeline', icon: TrendingUp, label: 'Pipeline', roles: ['SUPER_ADMIN', 'ADMIN'] },
  ]

  const administrativeItems = [
    { href: '/billing', icon: DollarSign, label: 'Billing & AR', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { href: '/invoices', icon: FileText, label: 'Invoices', roles: ['SUPER_ADMIN', 'ADMIN'] },
  ]

  const backhausAdminItems = [
    { href: '/creative-studio', icon: Camera, label: 'Backhaus Studio', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { href: '/admin/studio-clients', icon: Users, label: 'Studio Clients', roles: ['SUPER_ADMIN'] },
    { href: '/admin/feedback', icon: MessageSquare, label: 'Feedback', roles: ['SUPER_ADMIN'] },
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
    <Sidebar className="border-r border-warm-200 bg-warm-100">
      <SidebarHeader className="border-b border-warm-200 p-5">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold text-xl tracking-tight text-warm-900">
              Urban
            </span>
            <span className="font-display italic font-normal text-xl text-lime-600">
              Simple
            </span>
          </div>
          <p className="text-[10px] text-warm-500 tracking-widest uppercase font-medium">
            Business Management
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        {/* Admin Tools */}
        {adminItems.filter((item) => hasAccess(item.roles)).length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel
            className="text-[11px] font-semibold uppercase tracking-widest text-warm-500 px-3 mb-1.5 cursor-pointer hover:text-warm-700 transition-colors flex items-center justify-between"
            onClick={() => toggleSection('admin')}
          >
            <span>Admin Tools</span>
            {sidebarState.admin ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </SidebarGroupLabel>
          {sidebarState.admin && (
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {adminItems.filter((item) => hasAccess(item.roles)).map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        className={cn(
                          'h-10 px-3 rounded-sm transition-all duration-150 group',
                          active
                            ? 'bg-warm-200 text-warm-900'
                            : 'text-warm-600 hover:bg-warm-200/60 hover:text-warm-800'
                        )}
                      >
                        <Link href={item.href} className="flex items-center gap-3">
                          <Icon
                            className={cn(
                              'h-4.5 w-4.5 transition-colors duration-150',
                              active
                                ? 'text-lime-600'
                                : 'text-warm-500 group-hover:text-warm-700'
                            )}
                          />
                          <span className="font-medium text-[13px]">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
        )}

        {/* Growth */}
        {growthItems.filter((item) => hasAccess(item.roles)).length > 0 && (
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel
            className="text-[11px] font-semibold uppercase tracking-widest text-warm-500 px-3 mb-1.5 cursor-pointer hover:text-warm-700 transition-colors flex items-center justify-between"
            onClick={() => toggleSection('growth')}
          >
            <span>Growth</span>
            {sidebarState.growth ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </SidebarGroupLabel>
          {sidebarState.growth && (
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {growthItems.filter((item) => hasAccess(item.roles)).map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href, item.exact)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        className={cn(
                          'h-10 px-3 rounded-sm transition-all duration-150 group',
                          active
                            ? 'bg-warm-200 text-warm-900'
                            : 'text-warm-600 hover:bg-warm-200/60 hover:text-warm-800'
                        )}
                      >
                        <Link href={item.href} className="flex items-center gap-3">
                          <Icon
                            className={cn(
                              'h-4.5 w-4.5 transition-colors duration-150',
                              active
                                ? 'text-lime-600'
                                : 'text-warm-500 group-hover:text-warm-700'
                            )}
                          />
                          <span className="font-medium text-[13px]">{item.label}</span>
                        </Link>
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
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel
            className="text-[11px] font-semibold uppercase tracking-widest text-warm-500 px-3 mb-1.5 cursor-pointer hover:text-warm-700 transition-colors flex items-center justify-between"
            onClick={() => toggleSection('operations')}
          >
            <span>Operations</span>
            {sidebarState.operations ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </SidebarGroupLabel>
          {sidebarState.operations && (
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {operationsItems.filter((item) => hasAccess(item.roles)).map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href, item.exact)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        className={cn(
                          'h-10 px-3 rounded-sm transition-all duration-150 group',
                          active
                            ? 'bg-warm-200 text-warm-900'
                            : 'text-warm-600 hover:bg-warm-200/60 hover:text-warm-800'
                        )}
                      >
                        <Link href={item.href} className="flex items-center gap-3">
                          <Icon
                            className={cn(
                              'h-4.5 w-4.5 transition-colors duration-150',
                              active
                                ? 'text-lime-600'
                                : 'text-warm-500 group-hover:text-warm-700'
                            )}
                          />
                          <span className="font-medium text-[13px]">{item.label}</span>
                        </Link>
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
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel
            className="text-[11px] font-semibold uppercase tracking-widest text-warm-500 px-3 mb-1.5 cursor-pointer hover:text-warm-700 transition-colors flex items-center justify-between"
            onClick={() => toggleSection('clientRelations')}
          >
            <span>Client Relations</span>
            {sidebarState.clientRelations ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </SidebarGroupLabel>
          {sidebarState.clientRelations && (
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {clientRelationsItems.filter((item) => hasAccess(item.roles)).map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        className={cn(
                          'h-10 px-3 rounded-sm transition-all duration-150 group',
                          active
                            ? 'bg-warm-200 text-warm-900'
                            : 'text-warm-600 hover:bg-warm-200/60 hover:text-warm-800'
                        )}
                      >
                        <Link href={item.href} className="flex items-center gap-3">
                          <Icon
                            className={cn(
                              'h-4.5 w-4.5 transition-colors duration-150',
                              active
                                ? 'text-lime-600'
                                : 'text-warm-500 group-hover:text-warm-700'
                            )}
                          />
                          <span className="font-medium text-[13px]">{item.label}</span>
                        </Link>
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
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel
            className="text-[11px] font-semibold uppercase tracking-widest text-warm-500 px-3 mb-1.5 cursor-pointer hover:text-warm-700 transition-colors flex items-center justify-between"
            onClick={() => toggleSection('administrative')}
          >
            <span>Administrative</span>
            {sidebarState.administrative ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </SidebarGroupLabel>
          {sidebarState.administrative && (
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {administrativeItems.filter((item) => hasAccess(item.roles)).map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        className={cn(
                          'h-10 px-3 rounded-sm transition-all duration-150 group',
                          active
                            ? 'bg-warm-200 text-warm-900'
                            : 'text-warm-600 hover:bg-warm-200/60 hover:text-warm-800'
                        )}
                      >
                        <Link href={item.href} className="flex items-center gap-3">
                          <Icon
                            className={cn(
                              'h-4.5 w-4.5 transition-colors duration-150',
                              active
                                ? 'text-lime-600'
                                : 'text-warm-500 group-hover:text-warm-700'
                            )}
                          />
                          <span className="font-medium text-[13px]">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
        )}

        {/* BackHaus Admin */}
        {backhausAdminItems.filter((item) => hasAccess(item.roles)).length > 0 && (
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel
            className="text-[11px] font-semibold uppercase tracking-widest text-warm-500 px-3 mb-1.5 cursor-pointer hover:text-warm-700 transition-colors flex items-center justify-between"
            onClick={() => toggleSection('backhausAdmin')}
          >
            <span>Backhaus Admin</span>
            {sidebarState.backhausAdmin ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </SidebarGroupLabel>
          {sidebarState.backhausAdmin && (
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {backhausAdminItems.filter((item) => hasAccess(item.roles)).map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        className={cn(
                          'h-10 px-3 rounded-sm transition-all duration-150 group',
                          active
                            ? 'bg-warm-200 text-warm-900'
                            : 'text-warm-600 hover:bg-warm-200/60 hover:text-warm-800'
                        )}
                      >
                        <Link href={item.href} className="flex items-center gap-3">
                          <Icon
                            className={cn(
                              'h-4.5 w-4.5 transition-colors duration-150',
                              active
                                ? 'text-lime-600'
                                : 'text-warm-500 group-hover:text-warm-700'
                            )}
                          />
                          <span className="font-medium text-[13px]">{item.label}</span>
                        </Link>
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

      <SidebarFooter className="border-t border-warm-200 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="h-10 px-3 rounded-sm text-warm-600 hover:bg-warm-200/60 hover:text-warm-800 transition-all duration-150 group"
            >
              <LogOut className="h-4.5 w-4.5 text-warm-500 group-hover:text-warm-700 transition-colors" />
              <span className="font-medium text-[13px]">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
