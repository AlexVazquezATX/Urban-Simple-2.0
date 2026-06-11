'use client'

import { useState } from 'react'
import { Plus, Shield, UserCheck, Users, User } from 'lucide-react'
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

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  ASSOCIATE: 'Associate',
  CLIENT_USER: 'Client User',
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
      }
    } catch (error) {
      console.error('Failed to deactivate member:', error)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        kicker="OPERATIONS · PEOPLE"
        title="Team"
        subtitle="Manage your team members and their access"
        actions={
          <Button variant="gold" onClick={handleAddMember}>
            <Plus className="size-4" />
            Add Team Member
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Total Members"
          value={users.length}
          sub={`${activeUsers.length} active`}
          icon={Users}
        />
        <StatCard
          label="Admins"
          value={users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length}
          icon={Shield}
        />
        <StatCard
          label="Managers"
          value={users.filter((u) => u.role === 'MANAGER').length}
          icon={UserCheck}
        />
        <StatCard
          label="Associates"
          value={users.filter((u) => u.role === 'ASSOCIATE').length}
          icon={User}
        />
      </div>

      {/* Active Members */}
      <Card>
        <CardHeader>
          <CardTitle>Active Members</CardTitle>
          <CardDescription>
            {activeUsers.length} active team member{activeUsers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team members yet — it starts with one"
              description="Add your first team member to give them access to schedules, checklists, and assignments."
              action={
                <Button variant="outline" onClick={handleAddMember}>
                  <Plus className="size-4" />
                  Add Your First Team Member
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                          {roleLabels[member.role] || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">
                          {member.branch ? member.branch.name : 'All Branches'}
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
                          View
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
            <CardTitle>Inactive Members</CardTitle>
            <CardDescription>
              {inactiveUsers.length} inactive team member{inactiveUsers.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                        <Badge variant="neutral">{roleLabels[member.role] || member.role}</Badge>
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
                          View
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
          onClose={handleClosePanel}
          onSave={handleSaveMember}
          onDelete={handleDeleteMember}
        />
      )}
    </div>
  )
}
