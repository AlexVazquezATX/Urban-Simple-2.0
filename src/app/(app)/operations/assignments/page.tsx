import { Suspense } from 'react'
import { Plus, Edit } from 'lucide-react'
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
import { AssignmentForm } from '@/components/forms/assignment-form'
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Location Assignments</h1>
          <p className="text-muted-foreground">
            Manage associate assignments to locations with pay rates
          </p>
        </div>
        <AssignmentForm>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Assignment
          </Button>
        </AssignmentForm>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Assignments</CardTitle>
          <CardDescription>
            {assignments.length}{' '}
            {assignments.length === 1 ? 'assignment' : 'assignments'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No assignments yet</p>
              <AssignmentForm>
                <Button variant="outline" className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Assignment
                </Button>
              </AssignmentForm>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Associate</TableHead>
                  <TableHead>Monthly Pay</TableHead>
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
                    : '-'
                  const isActive =
                    assignment.isActive &&
                    (!assignment.endDate || new Date(assignment.endDate) >= new Date())

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.location.client.name} - {assignment.location.name}
                      </TableCell>
                      <TableCell>
                        {assignment.user.firstName} {assignment.user.lastName}
                      </TableCell>
                      <TableCell>
                        ${parseFloat(assignment.monthlyPay.toString()).toFixed(2)}
                      </TableCell>
                      <TableCell>{startDate}</TableCell>
                      <TableCell>{endDate}</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? 'default' : 'secondary'}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <AssignmentForm assignment={assignment}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </AssignmentForm>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AssignmentsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
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

