import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users
 * Get all users in the company (for DM user picker, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Get current user from session/auth
    const currentUser = await prisma.user.findFirst()

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get all users in the same company, excluding current user
    const users = await prisma.user.findMany({
      where: {
        companyId: currentUser.companyId,
        id: { not: currentUser.id }, // Exclude self
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        email: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      users,
    })
  } catch (error: any) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    )
  }
}
