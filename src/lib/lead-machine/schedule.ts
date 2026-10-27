// Vercel crons run in UTC, but the machine works on Austin time. Each job is
// scheduled at both UTC hours its local time can fall on (CDT and CST), and
// only the run that lands on the right local hour does anything.

import { prisma } from '@/lib/db'
import { getLocalHour } from '@/lib/services/autopilot-schedule'

export const SOURCING_LOCAL_HOUR = 2 // 2 a.m.
export const BRIEF_LOCAL_HOUR = 7 // 7:30 a.m. (cron fires at :30)

export async function companyTimezone(companyId: string): Promise<string> {
  const branch = await prisma.branch.findFirst({
    where: { companyId, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { timezone: true },
  })
  return branch?.timezone || 'America/Chicago'
}

export function isLocalHour(now: Date, timezone: string, hour: number): boolean {
  return getLocalHour(now, timezone) === hour
}
