import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { BellRing, Mail, MessageSquareText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IssueStatusBadge, IssueTypeBadge } from '@/components/issues/issue-badges'
import { prisma } from '@/lib/db'
import { smsConfigured } from '@/lib/notify'

// Server card for the location page: which client contacts get ops alerts for
// this location (per-location routing at a glance), plus recent issues.
export async function LocationAlertsCard({
  locationId,
  clientId,
}: {
  locationId: string
  clientId: string
}) {
  const [contacts, issues] = await Promise.all([
    prisma.clientContact.findMany({
      where: { clientId, OR: [{ alertEmail: true }, { alertSms: true }] },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        locationIds: true,
        alertEmail: true,
        alertSms: true,
        smsOptedOutAt: true,
      },
      orderBy: { firstName: 'asc' },
    }),
    prisma.issue.findMany({
      where: { locationId },
      select: { id: true, title: true, type: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ])

  const recipients = contacts.filter(
    (c) => c.locationIds.length === 0 || c.locationIds.includes(locationId)
  )
  const textingEnabled = smsConfigured()

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="size-4 text-muted-foreground" />
                Alerts
              </CardTitle>
              <CardDescription>
                Client contacts who hear about unfinished work and issue updates here.
              </CardDescription>
            </div>
            <Link
              href={`/clients/${clientId}`}
              className="shrink-0 text-xs font-medium text-primary hover:underline"
            >
              Edit contacts
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recipients.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-border p-3 text-sm text-muted-foreground">
              Nobody at the client gets alerts for this location yet. Turn on email or text alerts on a
              contact to start.
            </p>
          ) : (
            <div className="space-y-2">
              {recipients.map((c) => {
                const texts = c.alertSms && !c.smsOptedOutAt
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-[10px] border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.locationIds.length === 0 ? 'All locations' : 'This location'}
                        {c.alertEmail && c.email ? ` · ${c.email}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {c.alertEmail && (
                        <Badge variant="gold" title="Email alerts">
                          <Mail />
                          Email
                        </Badge>
                      )}
                      {texts && (
                        <Badge
                          variant={textingEnabled ? 'gold' : 'neutral'}
                          title={textingEnabled ? c.phone ?? 'Text alerts' : 'Texting is not set up yet'}
                        >
                          <MessageSquareText />
                          Text
                        </Badge>
                      )}
                      {c.smsOptedOutAt && <Badge variant="neutral">Texts stopped</Badge>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Recent issues</CardTitle>
              <CardDescription>Reports, requests and unfinished work at this location.</CardDescription>
            </div>
            <Link
              href={`/operations/issues?locationId=${locationId}&status=all`}
              className="shrink-0 text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No issues logged here yet.</p>
          ) : (
            <div className="space-y-2">
              {issues.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/operations/issues/${issue.id}`}
                  className="block rounded-[10px] border border-border px-3 py-2 transition-colors hover:border-primary/40 hover:bg-secondary/40"
                >
                  <p className="truncate text-sm font-medium text-foreground">{issue.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <IssueStatusBadge status={issue.status} />
                    {issue.type !== 'issue' && <IssueTypeBadge type={issue.type} />}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(issue.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
