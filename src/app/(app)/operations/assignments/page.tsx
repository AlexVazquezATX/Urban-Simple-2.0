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
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">Location Assignments</h1>
          <p className="text-sm text-warm-500 mt-1">
            Manage associate assignments to locations with pay rates
          </p>
        </div>
        <AssignmentForm>
          <Button variant="lime" className="rounded-sm">
            <Plus className="mr-2 h-4 w-4" />
            New Assignment
          </Button>
        </AssignmentForm>
      </div>

      <Card className="rounded-sm border-warm-200">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-base font-display font-medium text-warm-900">All Assignments</CardTitle>
          <CardDescription className="text-xs text-warm-500">
            {assignments.length}{' '}
            {assignments.length === 1 ? 'assignment' : 'assignments'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {assignments.length === 0 ? (
            <div className="text-center py-12 text-warm-500">
              <p>No assignments yet</p>
              <AssignmentForm>
                <Button variant="outline" className="mt-4 rounded-sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Assignment
                </Button>
              </AssignmentForm>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-warm-200">
                  <TableHead className="text-xs font-medium text-warm-500">Location</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500">Associate</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500">Monthly Pay</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500">Start Date</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500">End Date</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500">Status</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 text-right">Actions</TableHead>
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
                    <TableRow key={assignment.id} className="border-warm-200 hover:bg-warm-50">
                      <TableCell className="font-medium text-sm text-warm-900">
                        {assignment.location.client.name} - {assignment.location.name}
                      </TableCell>
                      <TableCell className="text-sm text-warm-700">
                        {assignment.user.firstName} {assignment.user.lastName}
                      </TableCell>
                      <TableCell className="text-sm text-warm-700">
                        ${parseFloat(assignment.monthlyPay.toString()).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-warm-600">{startDate}</TableCell>
                      <TableCell className="text-sm text-warm-600">{endDate}</TableCell>
                      <TableCell>
                        <Badge className={`rounded-sm text-[10px] px-1.5 py-0 ${
                          isActive
                            ? 'bg-lime-100 text-lime-700 border-lime-200'
                            : 'bg-warm-100 text-warm-600 border-warm-200'
                        }`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <AssignmentForm assignment={assignment}>
                          <Button variant="ghost" size="sm" className="rounded-sm h-7 px-2 text-xs">
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
          <Skeleton className="h-8 w-64 mb-2 rounded-sm" />
          <Skeleton className="h-4 w-96 rounded-sm" />
        </div>
        <Skeleton className="h-10 w-40 rounded-sm" />
      </div>
      <Card className="rounded-sm border-warm-200">
        <CardHeader className="p-4 pb-3">
          <Skeleton className="h-5 w-40 mb-2 rounded-sm" />
          <Skeleton className="h-3 w-32 rounded-sm" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-sm" />
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

