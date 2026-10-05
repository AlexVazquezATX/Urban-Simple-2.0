import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/growth/lead-deliveries - company-scoped delivery health and failures.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const where = { intake: { companyId: user.companyId } }
    const [counts, attention, oldestPending] = await Promise.all([
      prisma.leadDelivery.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.leadDelivery.findMany({
        where: { ...where, OR: [{ status: 'failed' }, { lastError: { not: null }, status: { not: 'sent' } }] },
        select: {
          id: true, kind: true, status: true, attempts: true, lastError: true,
          nextAttemptAt: true, firstAttemptAt: true,
          intake: { select: { prospectId: true, createdAt: true } },
        },
        orderBy: { createdAt: 'asc' }, take: 100,
      }),
      prisma.leadDelivery.findFirst({
        where: { ...where, status: { in: ['pending', 'processing'] } },
        select: { createdAt: true }, orderBy: { createdAt: 'asc' },
      }),
    ])
    return NextResponse.json({ counts, attention, oldestPendingAt: oldestPending?.createdAt ?? null })
  } catch {
    return NextResponse.json({ error: 'Delivery health unavailable' }, { status: 503 })
  }
}
