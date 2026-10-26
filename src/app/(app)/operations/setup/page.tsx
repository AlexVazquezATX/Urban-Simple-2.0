import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, CircleAlert, CircleDashed } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getOperationalWindow } from '@/lib/ops/field'
import { smsConfigured } from '@/lib/notify/sms'
import { GenerateShiftsButton } from './generate-shifts-button'

// Launch readiness: everything a location needs before the closed loop works
// (checklist, crew with a schedule, a manager, client alert contacts), plus
// team accounts and integrations. Each gap links to where it gets fixed.

function Check({ ok, warn, label }: { ok: boolean; warn?: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      {ok ? (
        <CheckCircle2 className="size-4 text-green-600 dark:text-green-300" />
      ) : warn ? (
        <CircleDashed className="size-4 text-gold-600 dark:text-gold-400" />
      ) : (
        <CircleAlert className="size-4 text-coral-600 dark:text-coral-300" />
      )}
      {label && <span className="text-muted-foreground">{label}</span>}
    </span>
  )
}

export default async function LaunchSetupPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) redirect('/dashboard')

  const { today } = await getOperationalWindow(user.companyId, user.branchId)
  const weekOut = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [locations, contacts, staff, upcoming] = await Promise.all([
    prisma.location.findMany({
      where: { isActive: true, deletedAt: null, client: { companyId: user.companyId, deletedAt: null, status: 'active' } },
      select: {
        id: true,
        name: true,
        clientId: true,
        checklistTemplateId: true,
        client: { select: { name: true } },
        serviceProfile: { select: { defaultManagerId: true, autoSchedule: true } },
        assignments: {
          where: { isActive: true },
          select: { daysOfWeek: true, cleaningWindowStart: true, cleaningWindowEnd: true },
        },
      },
      orderBy: [{ client: { name: 'asc' } }, { name: 'asc' }],
    }),
    prisma.clientContact.findMany({
      where: { client: { companyId: user.companyId, deletedAt: null }, OR: [{ alertEmail: true }, { alertSms: true }] },
      select: { clientId: true, locationIds: true },
    }),
    prisma.user.findMany({
      where: { companyId: user.companyId, isActive: true, role: { in: ['MANAGER', 'ASSOCIATE'] } },
      select: { id: true, role: true, firstName: true, lastName: true, email: true, phone: true, authId: true },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
    }),
    prisma.shift.groupBy({
      by: ['locationId'],
      where: { associateId: { not: null }, date: { gte: today, lt: weekOut }, status: { not: 'cancelled' } },
      _count: { _all: true },
    }),
  ])

  const shiftsByLocation = new Map(upcoming.map(u => [u.locationId, u._count._all]))
  const rows = locations.map(loc => {
    const alertContacts = contacts.filter(
      c => c.clientId === loc.clientId && (c.locationIds.length === 0 || c.locationIds.includes(loc.id))
    ).length
    const scheduled = loc.assignments.filter(a => a.daysOfWeek.length && a.cleaningWindowStart && a.cleaningWindowEnd).length
    const checks = {
      checklist: Boolean(loc.checklistTemplateId),
      crew: loc.assignments.length > 0,
      schedule: scheduled > 0,
      manager: Boolean(loc.serviceProfile?.defaultManagerId),
      alerts: alertContacts > 0,
      shifts: (shiftsByLocation.get(loc.id) ?? 0) > 0,
    }
    return { loc, alertContacts, checks, score: Object.values(checks).filter(Boolean).length }
  })
  const ready = rows.filter(r => r.score === 6).length

  const managers = staff.filter(s => s.role === 'MANAGER')
  const looksLikeTest = (s: { email: string; firstName: string }) =>
    /test|example|@urbansimple\.com$/i.test(s.email) || /^test$/i.test(s.firstName)
  const realManagers = managers.filter(m => !looksLikeTest(m))
  const associates = staff.filter(s => s.role === 'ASSOCIATE')
  const associatesWithLogin = associates.filter(a => a.authId).length

  const integrations = [
    { label: 'Email sending (Resend API key)', ok: Boolean(process.env.RESEND_API_KEY) },
    {
      label: 'Verified sender address for alerts',
      ok: Boolean(process.env.RESEND_PORTAL_FROM_EMAIL || process.env.RESEND_FROM_EMAIL),
    },
    { label: 'Public app URL for links in alerts', ok: Boolean(process.env.NEXT_PUBLIC_APP_URL) },
    { label: 'Text messages (Twilio)', ok: smsConfigured(), warn: true },
    { label: 'Scheduled jobs secret (CRON_SECRET)', ok: Boolean(process.env.CRON_SECRET) },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="OPERATIONS · LAUNCH SETUP"
        title="Launch readiness"
        subtitle={`${ready} of ${rows.length} locations fully set up for the closed loop`}
        actions={<GenerateShiftsButton />}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Managers</CardTitle>
            <CardDescription>Real manager accounts who will run nightly reviews</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Check ok={realManagers.length > 0} label={`${realManagers.length} real, ${managers.length - realManagers.length} test`} />
            {managers.map(m => (
              <div key={m.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{m.firstName} {m.lastName}</span>
                {looksLikeTest(m) ? <Badge variant="coral">test account</Badge> : !m.authId ? <Badge variant="gold">no login</Badge> : <Badge variant="green">ready</Badge>}
              </div>
            ))}
            <Link href="/team" className="block pt-1 text-xs text-primary hover:underline">Manage team</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Associates</CardTitle>
            <CardDescription>Field crew who run checklists on their phones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Check ok={associatesWithLogin === associates.length && associates.length > 0} warn label={`${associatesWithLogin} of ${associates.length} can log in`} />
            <Check ok={associates.every(a => a.phone)} warn label={`${associates.filter(a => a.phone).length} of ${associates.length} have a phone on file`} />
            <Link href="/operations/workforce" className="block pt-1 text-xs text-primary hover:underline">Open workforce</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Needed for alerts to actually go out</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {integrations.map(i => (
              <div key={i.label}><Check ok={i.ok} warn={i.warn} label={i.label} /></div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="px-5 pb-3 pt-5">
          <CardTitle>Locations</CardTitle>
          <CardDescription>
            Checklist, a crew with nights and hours, a default manager, client alert contacts, and shifts on the
            calendar. Open a location to fix what is missing.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto px-5 pb-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Checklist</TableHead>
                <TableHead>Crew</TableHead>
                <TableHead>Nights &amp; hours</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Client alerts</TableHead>
                <TableHead>Next 7 days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ loc, checks, alertContacts }) => (
                <TableRow key={loc.id}>
                  <TableCell className="min-w-48">
                    <Link href={`/locations/${loc.id}`} className="font-medium text-foreground hover:underline">
                      {loc.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{loc.client.name}</p>
                  </TableCell>
                  <TableCell><Check ok={checks.checklist} /></TableCell>
                  <TableCell><Check ok={checks.crew} label={String(loc.assignments.length)} /></TableCell>
                  <TableCell><Check ok={checks.schedule} /></TableCell>
                  <TableCell><Check ok={checks.manager} /></TableCell>
                  <TableCell><Check ok={checks.alerts} warn label={String(alertContacts)} /></TableCell>
                  <TableCell><Check ok={checks.shifts} label={String(shiftsByLocation.get(loc.id) ?? 0)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
