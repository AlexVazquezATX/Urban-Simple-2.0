import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST /api/clients/bulk-delete — soft-delete a set of clients in one go.
// Cascades soft-delete to each client's locations and deactivates active
// service agreements so financial rollups stop counting them.
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const ids: unknown = body.ids
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No client IDs provided' }, { status: 400 })
    }

    // Filter to only clients in this company that aren't already deleted.
    const targets = await prisma.client.findMany({
      where: {
        id: { in: ids as string[] },
        companyId: user.companyId,
        deletedAt: null,
      },
      select: { id: true },
    })
    const validIds = targets.map(t => t.id)
    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid clients found' }, { status: 404 })
    }

    const now = new Date()
    const result = await prisma.$transaction([
      prisma.client.updateMany({
        where: { id: { in: validIds }, companyId: user.companyId },
        data: { deletedAt: now, deletedById: user.id },
      }),
      prisma.location.updateMany({
        where: { clientId: { in: validIds }, deletedAt: null },
        data: { deletedAt: now, deletedById: user.id, isActive: false },
      }),
      prisma.serviceAgreement.updateMany({
        where: { clientId: { in: validIds }, isActive: true },
        data: { isActive: false, endDate: now },
      }),
    ])

    return NextResponse.json({
      success: true,
      deleted: result[0].count,
      locationsCascaded: result[1].count,
      agreementsClosed: result[2].count,
    })
  } catch (error: any) {
    console.error('Bulk delete clients failed:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete clients' },
      { status: 500 }
    )
  }
}
