'use client'

import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/portal/login')
    router.refresh()
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-muted-foreground hover:text-foreground',
        className
      )}
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign out
    </button>
  )
}
