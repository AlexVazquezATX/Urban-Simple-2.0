'use client'

import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/portal/login')
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex items-center gap-1.5 text-sm text-warm-600 hover:text-ocean-600"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  )
}
