import { Suspense } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { TeamMemberForm } from '@/components/forms/team-member-form'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  ASSOCIATE: 'Associate',
  CLIENT_USER: 'Client User',
}

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-plum-500',
  ADMIN: 'bg-bronze-500',
  MANAGER: 'bg-ocean-500',
  ASSOCIATE: 'bg-sage-500',
  CLIENT_USER: 'bg-terracotta-500',
}

async function TeamList() {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  // Get all users in the company
  const users = await prisma.user.findMany({
    where: {
      companyId: user.companyId,
    },
    include: {
      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: [
      { isActive: 'desc' },
      { firstName: 'asc' },
      { lastName: 'asc' },
    ],
  })

  // Get branches for the form
  const branches = await prisma.branch.findMany({
    where: {
      companyId: user.companyId,
      isActive: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  const activeUsers = users.filter((u) => u.isActive)
  const inactiveUsers = users.filter((u) => !u.isActive)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">
            Manage your team members and their access
          </p>
        </div>
        <TeamMemberForm branches={branches}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Team Member
          </Button>
        </TeamMemberForm>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeUsers.length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === 'MANAGER').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Associates</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === 'ASSOCIATE').length}
            </div>
          </CardContent>
        </Card>
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
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active team members yet</p>
              <TeamMemberForm branches={branches}>
                <Button variant="outline" className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Team Member
                </Button>
              </TeamMemberForm>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-bronze-100 text-bronze-700 text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {member.displayName || `${member.firstName} ${member.lastName}`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {member.firstName} {member.lastName}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{member.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{member.phone}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${roleColors[member.role] || 'bg-gray-500'} text-white`}
                        >
                          {roleLabels[member.role] || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.branch ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{member.branch.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">All Branches</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <TeamMemberForm member={member} branches={branches}>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </TeamMemberForm>
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
                <TableRow>
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
                    <TableRow key={member.id} className="opacity-60">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {member.displayName || `${member.firstName} ${member.lastName}`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{member.email}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {roleLabels[member.role] || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <TeamMemberForm member={member} branches={branches}>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </TeamMemberForm>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TeamListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function TeamPage() {
  return (
    <Suspense fallback={<TeamListSkeleton />}>
      <TeamList />
    </Suspense>
  )
}


