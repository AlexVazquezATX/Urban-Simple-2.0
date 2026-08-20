import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/growth/prospects/new-leads-count
 * Count of prospects with status "new" — the SAME definition as
 * GET /api/growth/prospects?status=new, so the two always agree.
 *
 * ?websiteOnly=true narrows to inbound website leads (source "website" with
 * the "Website Lead" tag) — the endpoint's original, narrower definition.
 * The response carries both numbers so callers can see the split.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const base = { companyId: user.companyId, deletedAt: null, status: 'new' }
    const [total, websiteLeads] = await Promise.all([
      prisma.prospect.count({ where: base }),
      prisma.prospect.count({
        where: { ...base, source: 'website', tags: { has: 'Website Lead' } },
      }),
    ])

    const websiteOnly = request.nextUrl.searchParams.get('websiteOnly') === 'true'
    return NextResponse.json({
      count: websiteOnly ? websiteLeads : total,
      totalNew: total,
      websiteLeads,
    })
  } catch (error) {
    console.error('Failed to fetch new leads count:', error)
    return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 })
  }
}
