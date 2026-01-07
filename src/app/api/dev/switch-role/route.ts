import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * POST /api/dev/switch-role
 * Developer tool to switch roles for testing (SUPER_ADMIN only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Debug logging
    console.log('[Role Switch] Current user:', {
      id: user.id,
      email: user.email,
      role: user.role,
    })

    // Only SUPER_ADMIN can use this feature
    if (user.role !== 'SUPER_ADMIN') {
      console.log('[Role Switch] Access denied - user role is:', user.role)
      return NextResponse.json(
        { error: `Access denied. Your current role is ${user.role}, not SUPER_ADMIN.` },
        { status: 403 }
      )
    }

    const { role } = await request.json()

    // Validate role
    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE', 'CLIENT_USER']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Update user's role temporarily in database
    await prisma.user.update({
      where: { id: user.id },
      data: { role },
    })

    return NextResponse.json({
      success: true,
      message: `Role switched to ${role}`,
      newRole: role,
    })
  } catch (error: any) {
    console.error('Role switch error:', error)
    return NextResponse.json(
      { error: 'Failed to switch role', details: error.message },
      { status: 500 }
    )
  }
}
