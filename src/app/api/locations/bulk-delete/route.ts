import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST /api/locations/bulk-delete — soft-delete a set of locations.
// Deactivates active service agreements for those locations so financial
// rollups stop counting them.
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const ids: unknown = body.ids
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No location IDs provided' }, { status: 400 })
    }

    const targets = await prisma.location.findMany({
      where: {
        id: { in: ids as string[] },
        deletedAt: null,
        client: { companyId: user.companyId },
      },
      select: { id: true },
    })
    const validIds = targets.map(t => t.id)
    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid locations found' }, { status: 404 })
    }

    const now = new Date()
    const result = await prisma.$transaction([
      prisma.location.updateMany({
        where: { id: { in: validIds } },
        data: { deletedAt: now, deletedById: user.id, isActive: false },
      }),
      prisma.serviceAgreement.updateMany({
        where: { locationId: { in: validIds }, isActive: true },
        data: { isActive: false, endDate: now },
      }),
    ])

    return NextResponse.json({
      success: true,
      deleted: result[0].count,
      agreementsClosed: result[1].count,
    })
  } catch (error: any) {
    console.error('Bulk delete locations failed:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete locations' },
      { status: 500 }
    )
  }
}
