import { Suspense } from 'react'
import { Plus, Edit, Users } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { AssignmentForm } from '@/components/forms/assignment-form'
import { formatMoneyExact } from '@/lib/format'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function AssignmentsList() {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const assignments = await prisma.locationAssignment.findMany({
    where: {
      location: {
        client: {
          branch: {
            companyId: user.companyId,
            ...(user.branchId && { id: user.branchId }),
          },
        },
      },
      isActive: true,
    },
    include: {
      location: {
        select: {
          id: true,
          name: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: [
      { location: { client: { name: 'asc' } } },
      { location: { name: 'asc' } },
    ],
  })

  return (
    <div className="space-y-4">
      <PageHeader
        kicker="OPERATIONS · ASSIGNMENTS"
        title="Location Assignments"
        subtitle="Manage associate assignments to locations with pay rates"
        actions={
          <AssignmentForm>
            <Button variant="gold">
              <Plus className="mr-2 h-4 w-4" />
              New Assignment
            </Button>
          </AssignmentForm>
        }
        className="mb-0"
      />

      {assignments.length === 0 ? (
        <Card className="py-2">
          <CardContent className="px-4">
            <EmptyState
              icon={Users}
              title="No assignments yet"
              description="Assign an associate to a location to set their monthly pay and start tracking coverage."
              action={
                <AssignmentForm>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Assignment
                  </Button>
                </AssignmentForm>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 py-0">
          <CardHeader className="px-5 pb-3 pt-5">
            <CardTitle>All Assignments</CardTitle>
            <CardDescription className="font-mono text-xs tabular-nums">
              {assignments.length}{' '}
              {assignments.length === 1 ? 'assignment' : 'assignments'}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Associate</TableHead>
                  <TableHead className="text-right">Monthly Pay</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment: any) => {
                  const startDate = new Date(assignment.startDate).toLocaleDateString()
                  const endDate = assignment.endDate
                    ? new Date(assignment.endDate).toLocaleDateString()
                    : '—'
                  const isActive =
                    assignment.isActive &&
                    (!assignment.endDate || new Date(assignment.endDate) >= new Date())

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium text-sm text-foreground">
                        {assignment.location.client.name} - {assignment.location.name}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {assignment.user.firstName} {assignment.user.lastName}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums text-foreground">
                        {formatMoneyExact(parseFloat(assignment.monthlyPay.toString()))}
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">
                        {startDate}
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">
                        {endDate}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? 'green' : 'neutral'}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <AssignmentForm assignment={assignment}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </AssignmentForm>
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

function AssignmentsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
      <Card className="gap-0 py-0">
        <CardHeader className="px-5 pb-3 pt-5">
          <Skeleton className="h-5 w-40 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AssignmentsPage() {
  return (
    <Suspense fallback={<AssignmentsListSkeleton />}>
      <AssignmentsList />
    </Suspense>
  )
}
