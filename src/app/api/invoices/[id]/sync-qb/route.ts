import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// POST /api/invoices/[id]/sync-qb - Push invoice to QuickBooks
//
// Not implemented yet. The integration currently mirrors FROM QuickBooks
// (see src/lib/qbo/sync.ts); pushing portal-created invoices to QBO is
// phase 2. This endpoint used to fake a sync by writing placeholder ids
// into the database, which made invoices look synced when they were not.
export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(
    {
      error:
        'Pushing invoices to QuickBooks is not available yet. Invoices currently sync from QuickBooks into the portal.',
    },
    { status: 501 }
  )
}
