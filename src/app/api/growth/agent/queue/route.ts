import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { prisma } from '@/lib/db'

// POST /api/growth/agent/queue — Add/remove prospects from agent queue
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { prospectIds, action, clearAll } = body

    // Clear entire queue for this company
    if (clearAll === true) {
      const result = await prisma.prospect.updateMany({
        where: { companyId: user.companyId, agentQueued: true },
        data: { agentQueued: false, agentQueuedAt: null },
      })
      return NextResponse.json({
        success: true,
        updated: result.count,
        action: 'clear',
        message: `Cleared ${result.count} prospects from queue`,
      })
    }

    if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json({ error: 'No prospect IDs provided' }, { status: 400 })
    }

    if (!['add', 'remove'].includes(action)) {
      return NextResponse.json({ error: 'action must be "add" or "remove"' }, { status: 400 })
    }

    // Verify all prospects belong to user's company
    const prospects = await prisma.prospect.findMany({
      where: { id: { in: prospectIds }, companyId: user.companyId },
      select: { id: true },
    })

    const validIds = prospects.map((p) => p.id)
    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid prospects found' }, { status: 404 })
    }

    const result = await prisma.prospect.updateMany({
      where: { id: { in: validIds }, companyId: user.companyId },
      data: {
        agentQueued: action === 'add',
        agentQueuedAt: action === 'add' ? new Date() : null,
      },
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
      action,
      message: `${action === 'add' ? 'Queued' : 'Removed from queue'} ${result.count} prospects`,
    })
  } catch (error: any) {
    console.error('Error updating agent queue:', error)
    return NextResponse.json(
      { error: 'Failed to update agent queue' },
      { status: 500 }
    )
  }
}
