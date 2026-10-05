import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SAFE_RETRY_WINDOW_MS } from '@/lib/leads/delivery'

// POST /api/growth/lead-deliveries/[id]/retry - requeue a failed job within its safe retry window.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const updated = await prisma.leadDelivery.updateMany({
    where: {
      id, intake: { companyId: user.companyId }, status: 'failed',
      firstAttemptAt: { gt: new Date(Date.now() - SAFE_RETRY_WINDOW_MS) },
    },
    data: { status: 'pending', attempts: 0, nextAttemptAt: new Date(), lockToken: null, lockedUntil: null },
  })
  if (!updated.count) {
    return NextResponse.json({ error: 'Job unavailable or retry window expired. Reconcile provider delivery before resending.' }, { status: 409 })
  }
  return NextResponse.json({ ok: true, status: 'pending' })
}
