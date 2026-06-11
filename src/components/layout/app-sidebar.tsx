'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
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
  Moon,
  Rocket,
  ShieldAlert,
  Search,
  Mail,
  TrendingUp,
  Sunrise,
  Sparkles,
  Palette,
  CheckSquare,
  Camera,
  Key,
  ThumbsUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DarkModeToggle } from '@/components/ui/dark-mode-toggle'
import { CommandPalette } from '@/components/layout/command-palette'

interface NavItem {
  href: string
  icon: typeof LayoutDashboard
  label: string
  exact?: boolean
  roles: string[]
}

interface NavGroup {
  label: string
  items: NavItem[]
}

// 4-group IA + Operations + Studio. Groups are always expanded — no
// accordions. Role gating preserved exactly from the previous sidebar.
export const navGroups: NavGroup[] = [
  {
    label: 'Today',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE', 'CLIENT_USER'] },
      { href: '/tasks', icon: CheckSquare, label: 'Tasks', roles: ['SUPER_ADMIN'] },
      { href: '/growth', icon: Rocket, label: 'Daily Planner', exact: true, roles: ['SUPER_ADMIN', 'ADMIN'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/operations', icon: ClipboardList, label: 'Operations', exact: true, roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
      { href: '/operations/workforce', icon: ShieldAlert, label: 'Workforce', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
      { href: '/operations/nightly-reviews', icon: Moon, label: 'Nightly Reviews', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
      { href: '/chat', icon: MessageSquare, label: 'Team Chat', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE'] },
      { href: '/team', icon: UserCog, label: 'Team', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
      { href: '/operations/schedule', icon: Calendar, label: 'Schedule', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
      { href: '/operations/assignments', icon: UserCheck, label: 'Assignments', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE'] },
      { href: '/operations/checklists', icon: ClipboardList, label: 'Checklists', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE'] },
    ],
  },
  {
    label: 'Growth',
    items: [
      { href: '/growth/prospects', icon: Users, label: 'Prospects', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { href: '/growth/pipeline', icon: TrendingUp, label: 'Pipeline', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { href: '/growth/outreach', icon: Mail, label: 'Outreach', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { href: '/growth/discovery', icon: Search, label: 'AI Discovery', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { href: '/creative-hub', icon: Palette, label: 'Creative Hub', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { href: '/dashboard/blog', icon: Sparkles, label: 'Blog', roles: ['SUPER_ADMIN'] },
      { href: '/pulse', icon: Sunrise, label: 'Pulse', roles: ['SUPER_ADMIN'] },
      { href: '/growth/api-keys', icon: Key, label: 'API Keys', roles: ['SUPER_ADMIN', 'ADMIN'] },
    ],
  },
  {
    label: 'Clients',
    items: [
      { href: '/clients', icon: Users, label: 'Clients', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
      { href: '/locations', icon: Building2, label: 'Locations', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
      { href: '/admin/feedback', icon: ThumbsUp, label: 'Feedback', roles: ['SUPER_ADMIN'] },
      { href: '/chat-analytics', icon: BarChart3, label: 'Chat Analytics', roles: ['SUPER_ADMIN', 'ADMIN'] },
    ],
  },
  {
    label: 'Money',
    items: [
      { href: '/financials', icon: BarChart3, label: 'Financials', exact: true, roles: ['SUPER_ADMIN'] },
      { href: '/billing', icon: DollarSign, label: 'Billing & AR', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { href: '/invoices', icon: FileText, label: 'Invoices', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { href: '/financials/expenses', icon: TrendingUp, label: 'Recurring', roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    label: 'Studio',
    items: [
      { href: '/creative-studio', icon: Camera, label: 'Backhaus Studio', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { href: '/admin/studio-clients', icon: Users, label: 'Studio Clients', roles: ['SUPER_ADMIN'] },
    ],
  },
]

export function AppSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [paletteOpen, setPaletteOpen] = useState(false)

  // User role state - cached to avoid refetching
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('user-role')
    }
    return null
  })
  const [userName, setUserName] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('user-name')
    }
    return null
  })

  useEffect(() => {
    // Only fetch if we don't have the role cached
    if (userRole) return

    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/users/me', { credentials: 'include' })
        if (response.ok) {
          const userData = await response.json()
          setUserRole(userData.role)
          sessionStorage.setItem('user-role', userData.role)
          const name = userData.name || userData.fullName || userData.email || null
          if (name) {
            setUserName(name)
            sessionStorage.setItem('user-name', name)
          }
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error)
      }
    }
    fetchUserRole()
  }, [userRole])

  // ⌘K / Ctrl+K opens the jump-to palette from anywhere in the admin.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const hasAccess = (roles: string[]) => {
    if (!userRole) return false
    return roles.includes(userRole)
  }

  const isActive = (href: string, exact?: boolean) => {
    if (href === '/') {
      return pathname === '/'
    }
    if (exact) {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  const roleLabel = userRole
    ? userRole.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
    : ''
  const displayName = userName || 'Account'

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      {/* Brand block + ⌘K command bar */}
      <SidebarHeader className="gap-3 p-4 pb-2">
        <div className="flex items-center gap-2.5 px-1 pt-1">
          <div className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-primary font-display text-base font-extrabold tracking-[-0.5px] text-primary-foreground">
            US
          </div>
          <div className="min-w-0">
            <div className="font-display text-[15px] font-bold leading-tight tracking-[-0.2px] text-sidebar-foreground">
              Urban <span className="font-medium italic text-primary">Simple</span>
            </div>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[1.6px] text-muted-foreground">
              Business OS
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex w-full items-center gap-2 rounded-[9px] border border-border bg-background px-2.5 py-2 text-left text-[12.5px] text-muted-foreground transition-colors hover:border-ring/40"
        >
          <Search className="size-3.5 shrink-0" />
          <span className="flex-1">Jump to…</span>
          <kbd className="rounded-[5px] border border-border bg-secondary px-1.5 py-px font-mono text-[10px]">⌘K</kbd>
        </button>
      </SidebarHeader>

      <SidebarContent className="scrollbar-elegant px-3 py-2">
        {navGroups.map((group) => {
          const visible = group.items.filter((item) => hasAccess(item.roles))
          if (visible.length === 0) return null
          return (
            <SidebarGroup key={group.label} className="mb-1">
              <SidebarGroupLabel className="kicker mb-1.5 px-2 text-muted-foreground">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-px">
                  {visible.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href, item.exact)

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          className={cn(
                            'h-8.5 rounded-lg border border-transparent px-2 transition-all duration-150 group',
                            active
                              ? 'border-primary/25 bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                          )}
                        >
                          <Link href={item.href} className="flex items-center gap-2.5">
                            <Icon
                              className={cn(
                                'size-[15px] transition-colors duration-150',
                                active
                                  ? 'text-primary'
                                  : 'text-muted-foreground group-hover:text-foreground'
                              )}
                            />
                            <span className="text-[13.5px]">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter className="gap-2.5 border-t border-sidebar-border p-3">
        <DarkModeToggle />
        <div className="flex items-center gap-2.5 rounded-[10px] border border-border bg-card p-2">
          <div className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 font-display text-xs font-bold text-primary-foreground dark:text-ink-950">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-semibold text-foreground">{displayName}</div>
            <div className="truncate text-[10.5px] text-muted-foreground">{roleLabel}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </SidebarFooter>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        groups={navGroups
          .map((g) => ({ ...g, items: g.items.filter((i) => hasAccess(i.roles)) }))
          .filter((g) => g.items.length > 0)}
      />
    </Sidebar>
  )
}
