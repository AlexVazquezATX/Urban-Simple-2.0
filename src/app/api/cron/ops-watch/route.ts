import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOperationalWindow, overnightStillActive } from '@/lib/ops/field'
import { notifyStaff, staffRecipientsForLocation, appBaseUrl } from '@/lib/notify'

// Vercel cron (every 15 min): keeps managers in the loop when something is
// silently wrong on a live night.
//   - No-show: an associate shift started 45+ minutes ago and nobody has
//     clocked in at any of its stops.
//   - Still on the clock: a stop has been clocked in for 10+ hours.
// No-show checks only cover associates who have used the app before.
// Each alert fires once (deduped on the notification link).

const NO_SHOW_GRACE_MIN = 45
const LONG_CLOCK_HOURS = 10

function minutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm)
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null
}

async function alreadySent(link: string, since: Date) {
  return (await prisma.notification.count({ where: { link, createdAt: { gte: since } } })) > 0
}

async function handle(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const results = { noShows: 0, longClocks: 0 }
  const companies = await prisma.company.findMany({ select: { id: true } })

  for (const company of companies) {
    const { today, yesterday, tomorrow, nowMinutes, timezone } = await getOperationalWindow(company.id)

    const shifts = await prisma.shift.findMany({
      where: {
        branch: { companyId: company.id },
        // Only associates already using the app (have clocked in before), so
        // generating shifts ahead of training doesn't page managers nightly.
        associate: { serviceLogs: { some: { clockIn: { not: null } } } },
        date: { gte: yesterday, lt: tomorrow },
        status: { in: ['scheduled', 'in_progress'] },
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        locationId: true,
        shiftLocations: { select: { locationId: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
        associateId: true,
        associate: { select: { firstName: true, lastName: true } },
        serviceLogs: { select: { clockIn: true }, where: { clockIn: { not: null } }, take: 1 },
      },
    })

    const alertedAssociates = new Set<string>() // one no-show alert per person per run
    for (const s of shifts) {
      if (s.serviceLogs.length > 0) continue
      if (s.associateId && alertedAssociates.has(s.associateId)) continue
      const start = minutes(s.startTime)
      if (start === null) continue
      const isToday = s.date.getTime() >= today.getTime()
      // Minutes since the scheduled start (yesterday's overnight shifts are
      // a day earlier, so add 24h to "now").
      const elapsed = isToday ? nowMinutes - start : nowMinutes + 1440 - start
      if (!isToday && !overnightStillActive(s.startTime, s.endTime, nowMinutes)) continue
      if (elapsed < NO_SHOW_GRACE_MIN || elapsed > 6 * 60) continue

      const locationId = s.shiftLocations[0]?.locationId ?? s.locationId
      if (!locationId) continue
      // Route crews (one associate, several stops a night) reach later stops
      // hours after their scheduled start; only alert when the associate
      // hasn't clocked in anywhere tonight.
      const workingTonight = await prisma.serviceLog.count({
        where: { associateId: s.associateId!, clockIn: { gte: new Date(Date.now() - 14 * 60 * 60 * 1000) } },
      })
      if (workingTonight > 0) continue
      alertedAssociates.add(s.associateId!)
      const link = `/operations/schedule?shift=${s.id}`
      if (await alreadySent(link, since)) continue

      const location = await prisma.location.findUnique({ where: { id: locationId }, select: { name: true } })
      const who = `${s.associate?.firstName ?? ''} ${s.associate?.lastName ?? ''}`.trim() || 'The associate'
      const staff = await staffRecipientsForLocation({ companyId: company.id, locationId, serviceDate: s.date })
      await notifyStaff(staff, {
        companyId: company.id,
        type: 'warning',
        title: `Not clocked in: ${who}`,
        message: `${location?.name ?? 'Shift'} started at ${s.startTime} and nobody has clocked in.`,
        link,
        subject: `Possible no-show: ${who} at ${location?.name ?? 'their shift'}`,
        email: {
          kicker: 'Possible no-show',
          title: `${who} has not clocked in`,
          rows: [
            ['Location', location?.name ?? ''],
            ['Scheduled', `${s.startTime} - ${s.endTime}`],
          ],
          ctaLabel: 'Open schedule',
          ctaUrl: `${appBaseUrl()}${link}`,
        },
        sms: `Urban Simple: ${who} has not clocked in at ${location?.name ?? 'their shift'} (started ${s.startTime}).`,
      })
      results.noShows++
    }

    const longOpen = await prisma.serviceLog.findMany({
      where: {
        location: { branch: { companyId: company.id } },
        clockIn: { lt: new Date(Date.now() - LONG_CLOCK_HOURS * 60 * 60 * 1000), gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        clockOut: null,
      },
      select: {
        id: true,
        clockIn: true,
        serviceDate: true,
        locationId: true,
        location: { select: { name: true } },
        associate: { select: { firstName: true, lastName: true } },
      },
    })
    for (const log of longOpen) {
      const link = `/operations/workforce?log=${log.id}`
      if (await alreadySent(link, new Date(Date.now() - 48 * 60 * 60 * 1000))) continue
      const who = `${log.associate.firstName} ${log.associate.lastName}`.trim()
      const staff = await staffRecipientsForLocation({ companyId: company.id, locationId: log.locationId, serviceDate: log.serviceDate })
      await notifyStaff(staff, {
        companyId: company.id,
        type: 'warning',
        title: `Still clocked in: ${who}`,
        message: `${log.location.name}: clocked in over ${LONG_CLOCK_HOURS} hours. Check whether they forgot to clock out.`,
        link,
        subject: `Still clocked in after ${LONG_CLOCK_HOURS}h: ${who}`,
        email: {
          kicker: 'Hours check',
          title: `${who} is still clocked in`,
          intro: 'Hours feed workforce compliance, so a forgotten clock-out should be corrected.',
          rows: [
            ['Location', log.location.name],
            ['Clocked in', log.clockIn ? log.clockIn.toLocaleString('en-US', { timeZone: timezone, weekday: 'short', hour: 'numeric', minute: '2-digit' }) : ''],
          ],
          ctaLabel: 'Open workforce',
          ctaUrl: `${appBaseUrl()}${link}`,
        },
      })
      results.longClocks++
    }
  }

  return NextResponse.json({ success: true, ...results })
}

export async function GET(request: NextRequest) {
  return handle(request)
}
export async function POST(request: NextRequest) {
  return handle(request)
}
