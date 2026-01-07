'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Shield, User, Users, Briefcase, Building2 } from 'lucide-react'
import { toast } from 'sonner'

interface RoleSwitcherProps {
  currentRole: string
  isSuperAdmin: boolean
}

const ROLE_ICONS = {
  SUPER_ADMIN: Shield,
  ADMIN: Briefcase,
  MANAGER: Users,
  ASSOCIATE: User,
  CLIENT_USER: Building2,
}

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  ASSOCIATE: 'Associate',
  CLIENT_USER: 'Client User',
}

export function RoleSwitcher({ currentRole, isSuperAdmin }: RoleSwitcherProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Only show for SUPER_ADMIN
  if (!isSuperAdmin) {
    return null
  }

  const handleRoleSwitch = async (newRole: string) => {
    if (newRole === currentRole) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/dev/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        toast.success(`Switched to ${ROLE_LABELS[newRole as keyof typeof ROLE_LABELS]}`)
        router.refresh()
        // Redirect to home to see role-specific view
        router.push('/')
      } else {
        const errorData = await response.json()
        console.error('Role switch failed:', errorData)
        throw new Error(errorData.error || 'Failed to switch role')
      }
    } catch (error) {
      console.error('Role switch error:', error)
      toast.error('Failed to switch role')
    } finally {
      setIsLoading(false)
    }
  }

  const CurrentIcon = ROLE_ICONS[currentRole as keyof typeof ROLE_ICONS] || User

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
        Dev Mode
      </Badge>
      <Select
        value={currentRole}
        onValueChange={handleRoleSwitch}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[180px] bg-white border-purple-300">
          <div className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(ROLE_LABELS).map(([value, label]) => {
            const Icon = ROLE_ICONS[value as keyof typeof ROLE_ICONS]
            return (
              <SelectItem key={value} value={value}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
