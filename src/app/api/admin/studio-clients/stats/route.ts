/**
 * Studio Admin Stats API
 *
 * GET - Get dashboard statistics
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getStudioAdminStats } from '@/lib/services/studio-admin-service'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await getStudioAdminStats()

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('[Admin Studio Stats] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
