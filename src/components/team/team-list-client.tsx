'use client'

import { useState, useEffect } from 'react'
import { Plus, Shield, UserCheck, Users, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { TeamMemberDetailPanel } from './team-member-detail-panel'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { useManagerLang } from '@/lib/i18n/use-manager-lang'

interface TeamMember {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName: string | null
  phone: string | null
  role: string
  isActive: boolean
  branchId: string | null
  branch: {
    id: string
    name: string
    code: string
  } | null
  smsAlerts?: boolean
  preferredLanguage?: string
  createdAt: string
}

interface Branch {
  id: string
  name: string
  code: string
}

interface TeamListClientProps {
  initialUsers: TeamMember[]
  branches: Branch[]
}

// Chip mapping per the design system: Super Admin/Admin → gold,
// Manager → teal, Associate (and everything else) → neutral.
const roleBadgeVariants: Record<string, 'gold' | 'teal' | 'neutral'> = {
  SUPER_ADMIN: 'gold',
  ADMIN: 'gold',
  MANAGER: 'teal',
  ASSOCIATE: 'neutral',
  CLIENT_USER: 'neutral',
}

export function TeamListClient({ initialUsers, branches }: TeamListClientProps) {
  const [users, setUsers] = useState<TeamMember[]>(initialUsers)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [isNewMember, setIsNewMember] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const { t } = useManagerLang()
  const tm = t.team

  // Creating/editing/deactivating team members is admin-only at the API. Gate
  // the write actions on the real role so managers don't get buttons that 403.
  useEffect(() => {
    fetch('/api/users/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setCanManage(data.role === 'ADMIN' || data.role === 'SUPER_ADMIN')
      })
      .catch(() => {})
  }, [])

  const activeUsers = users.filter((u) => u.isActive)
  const inactiveUsers = users.filter((u) => !u.isActive)

  const handleAddMember = () => {
    setSelectedMember(null)
    setIsNewMember(true)
  }

  const handleSelectMember = (member: TeamMember) => {
    setSelectedMember(member)
    setIsNewMember(false)
  }

  const handleClosePanel = () => {
    setSelectedMember(null)
    setIsNewMember(false)
  }

  const handleSaveMember = (savedMember?: TeamMember) => {
    if (savedMember) {
      setUsers((prev) => {
        const exists = prev.find((u) => u.id === savedMember.id)
        if (exists) {
          return prev.map((u) => (u.id === savedMember.id ? savedMember : u))
        }
        return [...prev, savedMember]
      })
    }
    setSelectedMember(null)
    setIsNewMember(false)
  }

  const handleDeleteMember = async (memberId: string) => {
    // Deactivate member
    try {
      const response = await fetch(`/api/users/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })

      if (response.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === memberId ? { ...u, isActive: false } : u))
        )
        toast.success(tm.toastDeactivated)
      } else {
        const error = await response.json().catch(() => ({}))
        toast.error(error.error || tm.toastDeactivateFailed)
      }
    } catch (error) {
      console.error('Failed to deactivate member:', error)
      toast.error(tm.toastDeactivateFailed)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        kicker={tm.kicker}
        title={tm.title}
        subtitle={tm.subtitle}
        actions={
          <>
            <LanguageToggle />
            {canManage && (
              <Button variant="gold" onClick={handleAddMember}>
                <Plus className="size-4" />
                {tm.addMember}
              </Button>
            )}
          </>
        }
      />

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label={tm.totalMembers}
          value={users.length}
          sub={tm.activeCount(activeUsers.length)}
          icon={Users}
        />
        <StatCard
          label={tm.admins}
          value={users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length}
          icon={Shield}
        />
        <StatCard
          label={tm.managers}
          value={users.filter((u) => u.role === 'MANAGER').length}
          icon={UserCheck}
        />
        <StatCard
          label={tm.associates}
          value={users.filter((u) => u.role === 'ASSOCIATE').length}
          icon={User}
        />
      </div>

      {/* Active Members */}
      <Card>
        <CardHeader>
          <CardTitle>{tm.activeMembers}</CardTitle>
          <CardDescription>{tm.activeDescription(activeUsers.length)}</CardDescription>
        </CardHeader>
        <CardContent>
          {activeUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={tm.emptyTitle}
              description={tm.emptyBody}
              action={
                canManage ? (
                  <Button variant="outline" onClick={handleAddMember}>
                    <Plus className="size-4" />
                    {tm.addFirst}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{tm.colMember}</TableHead>
                  <TableHead>{tm.colEmail}</TableHead>
                  <TableHead>{tm.colPhone}</TableHead>
                  <TableHead>{tm.colRole}</TableHead>
                  <TableHead>{tm.colBranch}</TableHead>
                  <TableHead className="text-right">{tm.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeUsers.map((member) => {
                  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
                  return (
                    <TableRow
                      key={member.id}
                      className="cursor-pointer"
                      onClick={() => handleSelectMember(member)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gold-600/10 text-gold-600 dark:bg-gold-400/12 dark:text-gold-400 text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground">
                              {member.displayName || `${member.firstName} ${member.lastName}`}
                            </div>
                            {member.displayName && (
                              <div className="text-xs text-muted-foreground">
                                {member.firstName} {member.lastName}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[13px] text-muted-foreground">
                          {member.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        {member.phone ? (
                          <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
                            {member.phone}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariants[member.role] || 'neutral'}>
                          {t.role[member.role] || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">
                          {member.branch ? member.branch.name : tm.allBranches}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectMember(member)
                          }}
                        >
                          {tm.view}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Inactive Members */}
      {inactiveUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{tm.inactiveMembers}</CardTitle>
            <CardDescription>{tm.inactiveDescription(inactiveUsers.length)}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{tm.colMember}</TableHead>
                  <TableHead>{tm.colEmail}</TableHead>
                  <TableHead>{tm.colRole}</TableHead>
                  <TableHead className="text-right">{tm.colActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveUsers.map((member) => {
                  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
                  return (
                    <TableRow
                      key={member.id}
                      className="cursor-pointer opacity-60"
                      onClick={() => handleSelectMember(member)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-secondary text-muted-foreground text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground">
                              {member.displayName || `${member.firstName} ${member.lastName}`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[13px] text-muted-foreground">
                          {member.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">{t.role[member.role] || member.role}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectMember(member)
                          }}
                        >
                          {tm.view}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Team Member Detail Panel */}
      {(selectedMember || isNewMember) && (
        <TeamMemberDetailPanel
          member={selectedMember}
          isNew={isNewMember}
          branches={branches}
          canManage={canManage}
          onClose={handleClosePanel}
          onSave={handleSaveMember}
          onDelete={handleDeleteMember}
        />
      )}
    </div>
  )
}
