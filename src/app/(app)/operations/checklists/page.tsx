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
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">No checklist templates yet</p>
          <ChecklistForm>
            <Button>
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
          <h1 className="text-3xl font-bold">Checklist Templates</h1>
          <p className="text-muted-foreground">
            Create and manage reusable service checklists
          </p>
        </div>
        <ChecklistForm>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </ChecklistForm>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Templates</CardTitle>
          <CardDescription>
            {templates.length} {templates.length === 1 ? 'template' : 'templates'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Spanish Name</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead>Services</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/operations/checklists/${template.id}`}
                        className="hover:underline"
                      >
                        {template.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {template.nameEs || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
                        {itemCount > 0 && ` • ${itemCount} items`}
                      </Badge>
                    </TableCell>
                    <TableCell>{template._count.locations}</TableCell>
                    <TableCell>{template._count.serviceLogs}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <DuplicateChecklistButton
                          templateId={template.id}
                          templateName={template.name}
                        />
                        <Link href={`/operations/checklists/${template.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
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
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
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

export default function ChecklistsPage() {
  return (
    <Suspense fallback={<ChecklistsListSkeleton />}>
      <ChecklistsList />
    </Suspense>
  )
}

