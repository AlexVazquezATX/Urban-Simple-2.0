import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/branches
 * List the company's branches (Austin, Dallas, …). Staff only. Used when
 * onboarding team members — a user's `branchId` scopes what a MANAGER sees.
 * Query: includeInactive=true to include deactivated branches.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'CLIENT_USER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true'
  const branches = await prisma.branch.findMany({
    where: { companyId: user.companyId, ...(includeInactive ? {} : { isActive: true }) },
    select: { id: true, name: true, code: true, timezone: true, isActive: true, phone: true, email: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ success: true, branches })
}
