import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { getSettings, updateSettings, validatePatch } from '@/lib/lead-machine/settings'
import { placesCallsThisMonth } from '@/lib/lead-machine/runs'
import { findymailUsedThisMonth } from '@/lib/lead-machine/prep/run'

async function admin(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user }
}

// GET /api/growth/machine - settings, recent runs, Places and Findymail usage,
// machine-added counts, accounts researched and drafts waiting for approval.
export async function GET(request: NextRequest) {
  const auth = await admin(request)
  if ('error' in auth) return auth.error
  const companyId = auth.user.companyId
  const weekAgo = new Date(Date.now() - 7 * 86_400_000)
  const [settings, runs, placesCalls, addedThisWeek, totalAdded, signals, findymailUsed, researched, draftsWaiting] = await Promise.all([
    getSettings(companyId),
    prisma.leadMachineRun.findMany({
      where: { companyId },
      orderBy: { startedAt: 'desc' },
      take: 40,
      select: { id: true, stage: true, status: true, dryRun: true, startedAt: true, finishedAt: true, stats: true, error: true },
    }),
    placesCallsThisMonth(companyId),
    prisma.prospect.count({ where: { companyId, source: 'lead_machine', createdAt: { gte: weekAgo } } }),
    prisma.prospect.count({ where: { companyId, source: 'lead_machine' } }),
    prisma.prospectSignal.count({ where: { companyId } }),
    findymailUsedThisMonth(companyId),
    prisma.prospectResearch.count({ where: { companyId } }),
    prisma.outreachMessage.count({
      where: { prospect: { companyId, source: 'lead_machine' }, approvalStatus: 'pending', status: 'pending', step: 1 },
    }),
  ])
  return NextResponse.json({
    settings,
    runs,
    placesCallsThisMonth: placesCalls,
    findymailUsedThisMonth: findymailUsed,
    addedThisWeek,
    totalAdded,
    signals,
    researched,
    draftsWaiting,
  })
}

// PATCH /api/growth/machine - { enabled?, dryRun?, dailyNewCap?, sourceCaps?, placesMonthlyCallCap?,
//   prepDailyCap?, findymailMonthlyCap?, briefEnabled?, notifyEmail? }
export async function PATCH(request: NextRequest) {
  const auth = await admin(request)
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => null)
  const parsed = validatePatch(body)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const settings = await updateSettings(auth.user.companyId, parsed.patch)
  return NextResponse.json({ settings })
}
