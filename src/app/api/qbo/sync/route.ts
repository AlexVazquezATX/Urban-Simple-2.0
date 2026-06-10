import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { syncFromQbo } from '@/lib/qbo/sync'

// POST /api/qbo/sync - Manually pull invoices and payments from QuickBooks
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const result = await syncFromQbo(user.companyId)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync from QuickBooks'
    console.error('QBO sync failed:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
