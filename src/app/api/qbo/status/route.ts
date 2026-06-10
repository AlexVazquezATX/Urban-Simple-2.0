import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { qboConfigured } from '@/lib/qbo/client'

// GET /api/qbo/status - Connection state for the current company
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connection = await prisma.qBOConnection.findUnique({
      where: { companyId: user.companyId },
      select: {
        realmId: true,
        isActive: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        lastSyncError: true,
        refreshTokenExpiresAt: true,
      },
    })

    return NextResponse.json({
      configured: qboConfigured(),
      connected: Boolean(connection?.isActive),
      realmId: connection?.realmId ?? null,
      lastSyncAt: connection?.lastSyncAt ?? null,
      lastSyncStatus: connection?.lastSyncStatus ?? null,
      lastSyncError: connection?.lastSyncError ?? null,
      reconnectNeeded: connection
        ? connection.refreshTokenExpiresAt < new Date()
        : false,
    })
  } catch (error) {
    console.error('Error fetching QBO status:', error)
    return NextResponse.json({ error: 'Failed to fetch QuickBooks status' }, { status: 500 })
  }
}
