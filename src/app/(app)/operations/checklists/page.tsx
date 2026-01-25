import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2 } from 'lucide-react'
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
import { ChecklistForm } from '@/components/forms/checklist-form'
import { DuplicateChecklistButton } from '@/components/operations/duplicate-checklist-button'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function ChecklistsList() {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const templates = await prisma.checklistTemplate.findMany({
    where: {
      companyId: user.companyId,
      isActive: true,
    },
    include: {
      _count: {
        select: {
          locations: true,
          serviceLogs: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  if (templates.length === 0) {
    return (
      <Card className="rounded-sm border-warm-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-warm-500 mb-4">No checklist templates yet</p>
          <ChecklistForm>
            <Button variant="lime" className="rounded-sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Template
            </Button>
          </ChecklistForm>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">Checklist Templates</h1>
          <p className="text-sm text-warm-500 mt-1">
            Create and manage reusable service checklists
          </p>
        </div>
        <ChecklistForm>
          <Button variant="lime" className="rounded-sm">
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </ChecklistForm>
      </div>

      <Card className="rounded-sm border-warm-200">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-base font-display font-medium text-warm-900">All Templates</CardTitle>
          <CardDescription className="text-xs text-warm-500">
            {templates.length} {templates.length === 1 ? 'template' : 'templates'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Table>
            <TableHeader>
              <TableRow className="border-warm-200">
                <TableHead className="text-xs font-medium text-warm-500">Name</TableHead>
                <TableHead className="text-xs font-medium text-warm-500">Spanish Name</TableHead>
                <TableHead className="text-xs font-medium text-warm-500">Sections</TableHead>
                <TableHead className="text-xs font-medium text-warm-500">Locations</TableHead>
                <TableHead className="text-xs font-medium text-warm-500">Services</TableHead>
                <TableHead className="text-xs font-medium text-warm-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template: any) => {
                const sections = Array.isArray(template.sections) ? template.sections : []
                const sectionCount = sections.length
                const itemCount = sections.reduce(
                  (sum: number, section: any) =>
                    sum + (Array.isArray(section.items) ? section.items.length : 0),
                  0
                )

                return (
                  <TableRow key={template.id} className="border-warm-200 hover:bg-warm-50">
                    <TableCell className="font-medium text-sm text-warm-900">
                      <Link
                        href={`/operations/checklists/${template.id}`}
                        className="hover:text-ocean-600 hover:underline"
                      >
                        {template.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-warm-500">
                      {template.nameEs || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300">
                        {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
                        {itemCount > 0 && ` • ${itemCount} items`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-warm-700">{template._count.locations}</TableCell>
                    <TableCell className="text-sm text-warm-700">{template._count.serviceLogs}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <DuplicateChecklistButton
                          templateId={template.id}
                          templateName={template.name}
                        />
                        <Link href={`/operations/checklists/${template.id}`}>
                          <Button variant="ghost" size="sm" className="rounded-sm h-7 px-2 text-xs">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function ChecklistsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2 rounded-sm" />
          <Skeleton className="h-4 w-64 rounded-sm" />
        </div>
        <Skeleton className="h-10 w-32 rounded-sm" />
      </div>
      <Card className="rounded-sm border-warm-200">
        <CardHeader className="p-4 pb-3">
          <Skeleton className="h-5 w-32 mb-2 rounded-sm" />
          <Skeleton className="h-3 w-48 rounded-sm" />
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

export default function ChecklistsPage() {
  return (
    <Suspense fallback={<ChecklistsListSkeleton />}>
      <ChecklistsList />
    </Suspense>
  )
}

