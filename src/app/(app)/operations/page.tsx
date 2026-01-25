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
        <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">Operations</h1>
        <p className="text-sm text-warm-500 mt-1">
          Manage service operations, schedules, and checklists
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-sm border-warm-200 hover:border-ocean-400 transition-colors">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-ocean-100 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-ocean-600" />
              </div>
              <div>
                <CardTitle className="text-base font-display font-medium text-warm-900">Checklists</CardTitle>
                <CardDescription className="text-xs text-warm-500">Manage checklist templates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold text-warm-900 mb-4">{templatesCount}</div>
            <Link href="/operations/checklists">
              <Button variant="outline" className="w-full rounded-sm">
                View Checklists
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-warm-200 hover:border-ocean-400 transition-colors">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-plum-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-plum-600" />
              </div>
              <div>
                <CardTitle className="text-base font-display font-medium text-warm-900">Assignments</CardTitle>
                <CardDescription className="text-xs text-warm-500">Manage location assignments</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold text-warm-900 mb-4">{assignmentsCount}</div>
            <Link href="/operations/assignments">
              <Button variant="outline" className="w-full rounded-sm">
                View Assignments
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-warm-200 hover:border-ocean-400 transition-colors">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-warm-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-warm-600" />
              </div>
              <div>
                <CardTitle className="text-base font-display font-medium text-warm-900">Schedule</CardTitle>
                <CardDescription className="text-xs text-warm-500">View and manage shifts</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold text-warm-900 mb-4">{shiftsCount}</div>
            <Link href="/operations/schedule">
              <Button variant="outline" className="w-full rounded-sm">
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

