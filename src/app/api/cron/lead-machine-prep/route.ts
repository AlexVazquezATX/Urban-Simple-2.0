import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runPrep } from '@/lib/lead-machine/prep/run'
import { companyTimezone, isLocalHour, PREP_LOCAL_HOUR } from '@/lib/lead-machine/schedule'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// GET /api/cron/lead-machine-prep - nightly account prep (research, contacts,
// first drafts into the approval queue) for every company running the machine
// live. Scheduled at 08:00 and 09:00 UTC; each company runs only on the one
// that is 3 a.m. local, an hour after sourcing. Dry-run companies are skipped:
// sourcing adds nothing for them, so there is nothing to prep.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const companies = await prisma.leadMachineSettings.findMany({
    where: { enabled: true, dryRun: false },
    select: { companyId: true },
  })
  const results = []
  const now = new Date()
  for (const { companyId } of companies) {
    if (!isLocalHour(now, await companyTimezone(companyId), PREP_LOCAL_HOUR)) continue
    const prep = await runPrep(companyId, { dryRun: false, now })
    results.push({
      companyId,
      ok: !!prep,
      accounts: prep?.accounts ?? 0,
      drafted: prep?.drafted ?? 0,
      noContact: prep?.noContact ?? 0,
      failed: prep?.failed ?? 0,
    })
  }
  return NextResponse.json({ ok: results.every((r) => r.ok), companies: results.length, results })
}
