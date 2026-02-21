import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { prisma } from '@/lib/db'

// POST /api/growth/prospects/bulk-update - Update multiple prospects at once
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ids, data } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No prospect IDs provided' }, { status: 400 })
    }

    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No update data provided' }, { status: 400 })
    }

    // Only allow updating certain fields
    const allowedFields = ['status', 'priority', 'assignedToId', 'tags']
    const updateData: any = {}

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Verify all prospects belong to user's company
    const prospects = await prisma.prospect.findMany({
      where: {
        id: { in: ids },
        companyId: user.companyId,
      },
      select: { id: true },
    })

    const validIds = prospects.map(p => p.id)

    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid prospects found' }, { status: 404 })
    }

    // Perform bulk update
    const result = await prisma.prospect.updateMany({
      where: {
        id: { in: validIds },
        companyId: user.companyId,
      },
      data: updateData,
    })

    // Create activity logs for each updated prospect
    if (updateData.status) {
      await prisma.prospectActivity.createMany({
        data: validIds.map(prospectId => ({
          prospectId,
          userId: user.id,
          type: 'status_change',
          title: `Status changed to ${updateData.status}`,
          description: `Bulk update: Status changed to ${updateData.status.replace('_', ' ')}`,
        })),
      })
    }

    return NextResponse.json({
      success: true,
      updated: result.count,
      message: `Updated ${result.count} prospects`,
    })
  } catch (error: any) {
    console.error('Error in bulk update:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update prospects' },
      { status: 500 }
    )
  }
}
