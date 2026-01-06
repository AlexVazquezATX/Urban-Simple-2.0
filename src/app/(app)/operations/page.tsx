import Link from 'next/link'
import { ClipboardList, Calendar, Users, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function OperationsDashboard() {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const [templatesCount, assignmentsCount, shiftsCount] = await Promise.all([
    prisma.checklistTemplate.count({
      where: {
        companyId: user.companyId,
        isActive: true,
      },
    }),
    prisma.locationAssignment.count({
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
    }),
    prisma.shift.count({
      where: {
        branch: {
          companyId: user.companyId,
          ...(user.branchId && { id: user.branchId }),
        },
        date: {
          gte: new Date(),
        },
        status: 'scheduled',
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Operations</h1>
        <p className="text-muted-foreground">
          Manage service operations, schedules, and checklists
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <ClipboardList className="h-8 w-8 text-ocean-600" />
              <CardTitle>Checklists</CardTitle>
            </div>
            <CardDescription>Manage checklist templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-4">{templatesCount}</div>
            <Link href="/operations/checklists">
              <Button variant="outline" className="w-full">
                View Checklists
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-bronze-600" />
              <CardTitle>Assignments</CardTitle>
            </div>
            <CardDescription>Manage location assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-4">{assignmentsCount}</div>
            <Link href="/operations/assignments">
              <Button variant="outline" className="w-full">
                View Assignments
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Calendar className="h-8 w-8 text-charcoal-600" />
              <CardTitle>Schedule</CardTitle>
            </div>
            <CardDescription>View and manage shifts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-4">{shiftsCount}</div>
            <Link href="/operations/schedule">
              <Button variant="outline" className="w-full">
                View Schedule
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default OperationsDashboard

