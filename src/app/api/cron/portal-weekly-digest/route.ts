import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Resend } from 'resend'
import { format, subDays, startOfDay } from 'date-fns'
import { PortalWeeklyDigestHtml } from '@/emails/PortalWeeklyDigest'

let resendClient: Resend | null = null
function getResend(): Resend | null {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

// Vercel cron — runs every Monday at 14:00 UTC (9am Central). For each active
// portal user, builds a weekly digest of the last 7 days of activity at their
// client's locations and emails it. Authenticates via CRON_SECRET.
async function handle(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resend = getResend()
  if (!resend) {
    return NextResponse.json({ error: 'Resend not configured' }, { status: 500 })
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const fromEmail = process.env.RESEND_PORTAL_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'no-reply@urbansimple.net'
  const replyTo = process.env.RESEND_PORTAL_REPLY_TO || 'alex@urbansimple.net'

  const periodEnd = startOfDay(new Date())
  const periodStart = subDays(periodEnd, 7)
  const weekRangeLabel = `${format(periodStart, 'MMM d')}–${format(subDays(periodEnd, 1), 'MMM d')}`

  // Find all active portal users.
  const portalUsers = await prisma.clientContact.findMany({
    where: {
      isPortalUser: true,
      userId: { not: null },
      email: { not: '' },
      client: { deletedAt: null, status: { in: ['active'] } },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      client: {
        select: {
          id: true,
          name: true,
          locations: {
            where: { isActive: true, deletedAt: null },
            select: { id: true },
          },
        },
      },
    },
  })

  type Result = { email: string; client: string; ok: boolean; error?: string; skipped?: string }
  const results: Result[] = []

  for (const u of portalUsers) {
    const locationIds = u.client.locations.map(l => l.id)

    // Skip if they have no locations to report on.
    if (locationIds.length === 0) {
      results.push({ email: u.email, client: u.client.name, ok: false, skipped: 'no locations' })
      continue
    }

    const [reviews, issuesOpened, issuesResolved, visitCount] = await Promise.all([
      prisma.serviceReview.findMany({
        where: {
          locationId: { in: locationIds },
          reviewDate: { gte: periodStart, lt: periodEnd },
          photos: { isEmpty: false },
        },
        orderBy: [{ reviewDate: 'desc' }],
        take: 6,
        select: {
          reviewDate: true,
          photos: true,
          location: { select: { name: true } },
        },
      }),
      prisma.issue.findMany({
        where: {
          clientId: u.client.id,
          createdAt: { gte: periodStart, lt: periodEnd },
        },
        select: {
          title: true,
          status: true,
          createdAt: true,
          location: { select: { name: true } },
        },
      }),
      prisma.issue.findMany({
        where: {
          clientId: u.client.id,
          resolvedAt: { gte: periodStart, lt: periodEnd },
        },
        select: {
          title: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
          location: { select: { name: true } },
        },
      }),
      prisma.shift.count({
        where: {
          OR: [
            { locationId: { in: locationIds } },
            { shiftLocations: { some: { locationId: { in: locationIds } } } },
          ],
          date: { gte: periodStart, lt: periodEnd },
          status: { in: ['scheduled', 'in_progress', 'completed'] },
        },
      }),
    ])

    // Skip if literally nothing happened — don't spam users with empty digests.
    if (reviews.length === 0 && issuesOpened.length === 0 && issuesResolved.length === 0 && visitCount === 0) {
      results.push({ email: u.email, client: u.client.name, ok: false, skipped: 'no activity' })
      continue
    }

    const photos = reviews
      .flatMap(r =>
        r.photos.map(url => ({
          url,
          locationName: r.location.name,
          reviewDate: format(r.reviewDate, 'MMM d'),
        }))
      )
      .slice(0, 6)

    const subject = `Your week at ${u.client.name} · ${weekRangeLabel}`

    const html = PortalWeeklyDigestHtml({
      recipientFirstName: u.firstName || u.client.name,
      clientName: u.client.name,
      weekRangeLabel,
      photos,
      issuesOpened: issuesOpened.map(i => ({
        title: i.title,
        status: i.status,
        locationName: i.location.name,
        reportedAt: format(i.createdAt, 'MMM d'),
      })),
      issuesResolved: issuesResolved.map(i => ({
        title: i.title,
        status: i.status,
        locationName: i.location.name,
        reportedAt: format(i.createdAt, 'MMM d'),
      })),
      visitCount,
      // Rate link → mailto for v1 (zero new schema, real human reply to the team).
      rateLink: `mailto:${replyTo}?subject=${encodeURIComponent(`Weekly rating · ${u.client.name}`)}&body=${encodeURIComponent('How was our service this week?\n\n')}`,
      portalLink: `${baseUrl}/portal`,
    })

    try {
      await resend.emails.send({
        from: fromEmail,
        to: u.email,
        replyTo,
        subject,
        html,
      })
      results.push({ email: u.email, client: u.client.name, ok: true })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[portal-weekly-digest] failed for ${u.email}:`, error)
      results.push({ email: u.email, client: u.client.name, ok: false, error: message })
    }
  }

  return NextResponse.json({
    success: true,
    period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
    total: portalUsers.length,
    sent: results.filter(r => r.ok).length,
    skipped: results.filter(r => r.skipped).length,
    failed: results.filter(r => !r.ok && !r.skipped).length,
    results,
  })
}

export async function GET(request: NextRequest) {
  return handle(request)
}
export async function POST(request: NextRequest) {
  return handle(request)
}
