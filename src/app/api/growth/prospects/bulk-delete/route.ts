import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { prisma } from '@/lib/db'

// POST /api/growth/prospects/bulk-delete - Soft-delete multiple prospects at once.
// Also cancels any pending outreach messages so deleted prospects stop the funnel.
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No prospect IDs provided' }, { status: 400 })
    }

    // Verify all prospects belong to the user's company and aren't already deleted
    const prospects = await prisma.prospect.findMany({
      where: {
        id: { in: ids },
        companyId: user.companyId,
        deletedAt: null,
      },
      select: { id: true },
    })

    const validIds = prospects.map(p => p.id)

    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid prospects found' }, { status: 404 })
    }

    const now = new Date()

    // Soft delete
    const result = await prisma.prospect.updateMany({
      where: {
        id: { in: validIds },
        companyId: user.companyId,
      },
      data: {
        deletedAt: now,
        deletedById: user.id,
      },
    })

    // Cancel any pending outreach messages for these prospects
    await prisma.outreachMessage.updateMany({
      where: {
        prospectId: { in: validIds },
        status: 'pending',
      },
      data: {
        status: 'failed',
      },
    })

    // Also mark their per-prospect campaigns as cancelled so the executor skips them
    await prisma.outreachCampaign.updateMany({
      where: {
        companyId: user.companyId,
        prospectId: { in: validIds },
        status: { in: ['active', 'draft'] },
      },
      data: {
        status: 'cancelled',
      },
    })

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `Deleted ${result.count} prospects`,
    })
  } catch (error: any) {
    console.error('Error in bulk delete:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete prospects' },
      { status: 500 }
    )
  }
}
