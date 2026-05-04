import { NextRequest, NextResponse } from 'next/server'
import { addDays, endOfDay, startOfDay } from 'date-fns'
import { prisma } from '@/lib/db'
import { generateDispatchForCompany } from '@/lib/operations/dispatch-generator'

/**
 * Vercel cron endpoint that regenerates next week's dispatch routes for every
 * company that has at least one autoSchedule location. Schedule via vercel.json
 * (e.g. Sunday 23:00 UTC = Sunday evening Central). Authenticates via
 * Authorization: Bearer ${CRON_SECRET}.
 *
 * The window is "tomorrow through 7 days after tomorrow" so a Sunday-night run
 * generates Mon-Sun for the upcoming week. Matches what the user-triggered
 * button does with default range.
 */
async function handle(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Pre-build next week: tomorrow + 6 days = 7-day window starting tomorrow.
  const tomorrow = startOfDay(addDays(new Date(), 1))
  const rangeStart = tomorrow
  const rangeEnd = endOfDay(addDays(tomorrow, 6))

  // Find companies that actually use dispatch.
  const companiesWithDispatch = await prisma.company.findMany({
    where: {
      branches: {
        some: {
          clients: {
            some: {
              locations: {
                some: {
                  isActive: true,
                  serviceProfile: { is: { autoSchedule: true } },
                },
              },
            },
          },
        },
      },
    },
    select: { id: true, name: true },
  })

  const results: Array<{
    companyId: string
    companyName: string
    ok: boolean
    summary?: Awaited<ReturnType<typeof generateDispatchForCompany>>
    error?: string
  }> = []

  for (const company of companiesWithDispatch) {
    try {
      const summary = await generateDispatchForCompany({
        companyId: company.id,
        branchId: null,
        rangeStart,
        rangeEnd,
      })
      results.push({ companyId: company.id, companyName: company.name, ok: true, summary })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[cron/dispatch-regenerate] failed for ${company.name}:`, error)
      results.push({
        companyId: company.id,
        companyName: company.name,
        ok: false,
        error: message,
      })
    }
  }

  return NextResponse.json({
    success: true,
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    companiesProcessed: results.length,
    results,
  })
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
