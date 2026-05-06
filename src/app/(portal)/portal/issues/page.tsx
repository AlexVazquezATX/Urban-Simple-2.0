import Link from 'next/link'
import { format } from 'date-fns'
import { Plus, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'

export default async function PortalIssuesPage() {
  const ctx = await requirePortalContext()

  const issues = await prisma.issue.findMany({
    where: { clientId: ctx.client.id },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 60,
    select: {
      id: true,
      title: true,
      category: true,
      severity: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      location: { select: { id: true, name: true } },
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-medium text-warm-900">Issues</h1>
          <p className="mt-1 text-sm text-warm-500">Things that need attention. We see these in real time.</p>
        </div>
        <Link href="/portal/issues/new">
          <Button variant="lime" className="rounded-sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Report
          </Button>
        </Link>
      </div>

      {issues.length === 0 ? (
        <div className="rounded-sm border border-dashed border-warm-300 bg-white p-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-lime-500" />
          <p className="mt-2 text-sm text-warm-700">No issues. Everything looks good.</p>
          <p className="text-xs text-warm-500">Report something if you spot it.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {issues.map((i) => {
            const statusIcon =
              i.status === 'resolved' || i.status === 'closed' ? (
                <CheckCircle2 className="h-4 w-4 text-lime-600" />
              ) : i.status === 'in_progress' ? (
                <Clock className="h-4 w-4 text-amber-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )

            return (
              <li key={i.id}>
                <Link
                  href={`/portal/issues/${i.id}`}
                  className="flex items-start gap-3 rounded-sm border border-warm-200 bg-white p-3 hover:border-ocean-400 transition-colors"
                >
                  <div className="mt-0.5 shrink-0">{statusIcon}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-warm-900 line-clamp-2">{i.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-warm-500">
                      {i.location.name} • {format(i.createdAt, 'MMM d')} • {i.category}
                    </p>
                  </div>
                  <Badge
                    className={`shrink-0 rounded-sm text-[10px] px-1.5 py-0 ${
                      i.severity === 'critical'
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : i.severity === 'high'
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-warm-100 text-warm-600 border-warm-200'
                    }`}
                  >
                    {i.severity}
                  </Badge>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
