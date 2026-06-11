import { Suspense } from 'react'
import Link from 'next/link'
import { ClipboardList, Pencil } from 'lucide-react'
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
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { NewChecklistButton } from '@/components/operations/new-checklist-button'
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

  return (
    <div>
      <PageHeader
        kicker="OPERATIONS · CHECKLISTS"
        title="Checklist Templates"
        subtitle="Create and manage reusable service checklists"
        actions={<NewChecklistButton />}
      />

      {templates.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={ClipboardList}
              title="No checklists yet — build your first one"
              description="Templates keep every crew working the same standard, in English and Spanish. Create one and assign it to your locations."
              action={
                <NewChecklistButton variant="outline" label="Create Your First Template" />
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>All Templates</CardTitle>
            <CardDescription className="text-xs">
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
                      <TableCell className="text-sm font-medium text-foreground">
                        <Link
                          href={`/operations/checklists/${template.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {template.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {template.nameEs || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">
                          {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
                          {itemCount > 0 && ` · ${itemCount} items`}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-foreground">
                        {template._count.locations}
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-foreground">
                        {template._count.serviceLogs}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <DuplicateChecklistButton
                            templateId={template.id}
                            templateName={template.name}
                          />
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/operations/checklists/${template.id}`}>
                              <Pencil className="size-4" />
                              Edit
                            </Link>
                          </Button>
                        </div>
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

function ChecklistsListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <Skeleton className="mb-2 h-3 w-40" />
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-[9px]" />
      </div>
      <Card className="gap-4">
        <CardHeader>
          <Skeleton className="mb-2 h-5 w-32" />
          <Skeleton className="h-3 w-48" />
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
