'use client'

import { useState } from 'react'
import { Plus, Mail, Phone, Building2, Shield, UserCheck, Users, User } from 'lucide-react'
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

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-plum-100 text-plum-700 border-plum-200',
  ADMIN: 'bg-bronze-100 text-bronze-700 border-bronze-200',
  MANAGER: 'bg-ocean-100 text-ocean-700 border-ocean-200',
  ASSOCIATE: 'bg-lime-100 text-lime-700 border-lime-200',
  CLIENT_USER: 'bg-warm-100 text-warm-600 border-warm-200',
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">
            Team Members
          </h1>
          <p className="text-sm text-warm-500">
            Manage your team members and their access
          </p>
        </div>
        <Button variant="lime" className="rounded-sm" onClick={handleAddMember}>
          <Plus className="mr-2 h-4 w-4" />
          Add Team Member
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warm-700">Total Members</CardTitle>
            <Users className="h-4 w-4 text-warm-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-medium text-warm-900">{users.length}</div>
            <p className="text-xs text-warm-500">{activeUsers.length} active</p>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warm-700">Admins</CardTitle>
            <Shield className="h-4 w-4 text-warm-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-medium text-warm-900">
              {users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warm-700">Managers</CardTitle>
            <UserCheck className="h-4 w-4 text-warm-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-medium text-warm-900">
              {users.filter((u) => u.role === 'MANAGER').length}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warm-700">Associates</CardTitle>
            <User className="h-4 w-4 text-warm-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-medium text-warm-900">
              {users.filter((u) => u.role === 'ASSOCIATE').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Members */}
      <Card className="rounded-sm border-warm-200">
        <CardHeader>
          <CardTitle className="font-display font-medium text-warm-900">Active Members</CardTitle>
          <CardDescription className="text-warm-500">
            {activeUsers.length} active team member{activeUsers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeUsers.length === 0 ? (
            <div className="text-center py-8 text-warm-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-warm-400" />
              <p>No active team members yet</p>
              <Button
                variant="outline"
                className="mt-4 rounded-sm border-warm-200 text-warm-700 hover:border-ocean-400"
                onClick={handleAddMember}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Team Member
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-warm-200 hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">
                    Member
                  </TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">
                    Email
                  </TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">
                    Phone
                  </TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">
                    Role
                  </TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">
                    Branch
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-warm-500 uppercase tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeUsers.map((member) => {
                  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
                  return (
                    <TableRow
                      key={member.id}
                      className="border-warm-200 hover:bg-warm-50 cursor-pointer"
                      onClick={() => handleSelectMember(member)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-bronze-100 text-bronze-700 text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-warm-900">
                              {member.displayName || `${member.firstName} ${member.lastName}`}
                            </div>
                            {member.displayName && (
                              <div className="text-xs text-warm-500">
                                {member.firstName} {member.lastName}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-warm-600">
                          <Mail className="h-3 w-3 text-warm-400" />
                          <span className="text-sm">{member.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.phone ? (
                          <div className="flex items-center gap-2 text-warm-600">
                            <Phone className="h-3 w-3 text-warm-400" />
                            <span className="text-sm">{member.phone}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-warm-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`rounded-sm text-[10px] px-1.5 py-0 ${roleColors[member.role] || 'bg-warm-100 text-warm-600 border-warm-200'}`}
                        >
                          {roleLabels[member.role] || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.branch ? (
                          <div className="flex items-center gap-2 text-warm-600">
                            <Building2 className="h-3 w-3 text-warm-400" />
                            <span className="text-sm">{member.branch.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-warm-500">All Branches</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-sm text-warm-600 hover:text-ocean-600 hover:bg-warm-50"
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
        <Card className="rounded-sm border-warm-200">
          <CardHeader>
            <CardTitle className="font-display font-medium text-warm-900">
              Inactive Members
            </CardTitle>
            <CardDescription className="text-warm-500">
              {inactiveUsers.length} inactive team member{inactiveUsers.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-warm-200 hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">
                    Member
                  </TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">
                    Email
                  </TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">
                    Role
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium text-warm-500 uppercase tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveUsers.map((member) => {
                  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
                  return (
                    <TableRow
                      key={member.id}
                      className="border-warm-200 opacity-60 hover:bg-warm-50 cursor-pointer"
                      onClick={() => handleSelectMember(member)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-warm-100 text-warm-600 text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-warm-700">
                              {member.displayName || `${member.firstName} ${member.lastName}`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-warm-600">{member.email}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="rounded-sm text-[10px] px-1.5 py-0 bg-warm-100 text-warm-600 border-warm-200"
                        >
                          {roleLabels[member.role] || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-sm text-warm-600 hover:text-ocean-600 hover:bg-warm-50"
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
