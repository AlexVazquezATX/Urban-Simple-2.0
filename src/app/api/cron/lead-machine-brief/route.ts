import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendBrief } from '@/lib/lead-machine/brief'
import { BRIEF_LOCAL_HOUR, companyTimezone, isLocalHour } from '@/lib/lead-machine/schedule'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/cron/lead-machine-brief - the morning brief, Telegram or email.
// Scheduled at 12:30 and 13:30 UTC; each company gets it at 7:30 local.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const companies = await prisma.leadMachineSettings.findMany({
    where: { enabled: true, briefEnabled: true },
    select: { companyId: true },
  })
  const results = []
  const now = new Date()
  for (const { companyId } of companies) {
    if (!isLocalHour(now, await companyTimezone(companyId), BRIEF_LOCAL_HOUR)) continue
    const { channel } = await sendBrief(companyId)
    results.push({ companyId, channel })
  }
  return NextResponse.json({ ok: results.every((r) => r.channel), results })
}
