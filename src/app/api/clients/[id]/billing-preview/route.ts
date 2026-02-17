import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateBillingPreview } from '@/lib/billing/billing-engine'

// GET /api/clients/[id]/billing-preview?year=2026&month=3
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)

    const now = new Date()
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10)
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10)

    if (month < 1 || month > 12) {
      return NextResponse.json({ error: 'Month must be between 1 and 12' }, { status: 400 })
    }

    const preview = await generateBillingPreview(id, user.companyId, year, month)
    return NextResponse.json(preview)
  } catch (error: any) {
    console.error('Billing preview error:', error)
    if (error.message === 'Client not found') {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to generate billing preview' }, { status: 500 })
  }
}
