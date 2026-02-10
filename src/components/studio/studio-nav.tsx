'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Home,
  Camera,
  Layers,
  Palette,
  User,
  LogOut,
  CreditCard,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserData {
  firstName: string
  lastName: string
  email: string
  role: string
  companyId: string
}

interface UsageData {
  planTier: string
  generationsUsed: number
  generationsLimit: number
  status: string
}

const NAV_LINKS = [
  { href: '/studio', label: 'Home', icon: Home, exact: true },
  { href: '/studio/generate', label: 'Generate', icon: Camera },
  { href: '/studio/gallery', label: 'Gallery', icon: Layers },
  { href: '/studio/brand-kit', label: 'Brand Kit', icon: Palette },
]

const TIER_LABELS: Record<string, string> = {
  TRIAL: 'Free',
  STARTER: 'Starter',
  PROFESSIONAL: 'Pro',
  ENTERPRISE: 'Max',
}

const TIER_COLORS: Record<string, string> = {
  TRIAL: 'bg-warm-100 text-warm-600 border-warm-200',
  STARTER: 'bg-ocean-100 text-ocean-700 border-ocean-200',
  PROFESSIONAL: 'bg-plum-100 text-plum-700 border-plum-200',
  ENTERPRISE: 'bg-amber-100 text-amber-700 border-amber-200',
}

export function StudioNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/users/me').then(r => r.ok ? r.json() : null),
      fetch('/api/creative-studio/usage').then(r => r.ok ? r.json() : null),
    ]).then(([userData, usageData]) => {
      setUser(userData)
      setUsage(usageData)
    }).catch(console.error)
  }, [])

  // Close account menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setAccountMenuOpen(false)
  }, [pathname])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/studio/login')
  }

  const tierLabel = TIER_LABELS[usage?.planTier || 'TRIAL'] || 'Free'
  const tierColor = TIER_COLORS[usage?.planTier || 'TRIAL'] || TIER_COLORS.TRIAL

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-warm-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/studio" className="flex items-baseline gap-1 shrink-0">
            <span className="font-bold text-xl tracking-tight text-charcoal-900">
              Urban
            </span>
            <span className="font-display italic text-xl text-bronze-600">
              Studio
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1 ml-8">
            {NAV_LINKS.map(({ href, label, icon: Icon, exact }) => {
              const isActive = exact ? pathname === href : pathname === href || pathname?.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-warm-100 text-warm-900'
                      : 'text-warm-500 hover:text-warm-900 hover:bg-warm-50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Right side: plan badge + account */}
          <div className="hidden md:flex items-center gap-3">
            {/* Plan tier badge */}
            <Badge variant="outline" className={cn('text-xs font-medium', tierColor)}>
              {tierLabel}
            </Badge>

            {/* Account dropdown */}
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm text-warm-600 hover:text-warm-900 hover:bg-warm-50 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-ocean-100 flex items-center justify-center">
                  <span className="text-xs font-medium text-ocean-700">
                    {user?.firstName?.[0] || 'U'}
                  </span>
                </div>
                <ChevronDown className={cn(
                  'w-3.5 h-3.5 transition-transform',
                  accountMenuOpen && 'rotate-180'
                )} />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-warm-200 py-1 z-50">
                  {user && (
                    <div className="px-3 py-2 border-b border-warm-100">
                      <p className="text-sm font-medium text-warm-900 truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-warm-500 truncate">{user.email}</p>
                    </div>
                  )}
                  <Link
                    href="/studio/account"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-warm-700 hover:bg-warm-50"
                  >
                    <User className="w-4 h-4" />
                    Account
                  </Link>
                  <Link
                    href="/studio/account"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-warm-700 hover:bg-warm-50"
                  >
                    <CreditCard className="w-4 h-4" />
                    Billing
                  </Link>
                  <div className="border-t border-warm-100 mt-1 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: plan badge + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <Badge variant="outline" className={cn('text-[10px] font-medium', tierColor)}>
              {tierLabel}
            </Badge>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-warm-600 hover:text-warm-900"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-warm-200">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map(({ href, label, icon: Icon, exact }) => {
              const isActive = exact ? pathname === href : pathname === href || pathname?.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium',
                    isActive
                      ? 'bg-warm-100 text-warm-900'
                      : 'text-warm-600 hover:bg-warm-50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}

            <div className="border-t border-warm-100 pt-2 mt-2 space-y-1">
              <Link
                href="/studio/account"
                className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-warm-600 hover:bg-warm-50"
              >
                <User className="w-4 h-4" />
                Account & Billing
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-red-600 hover:bg-red-50 w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
