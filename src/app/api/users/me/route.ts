import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/users/me
 * Get current user's information
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[/api/users/me] User:', {
      id: user.id,
      email: user.email,
      role: user.role,
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
      branchId: user.branchId,
      emailSignature: user.emailSignature,
    })
  } catch (error: any) {
    console.error('Get current user error:', error)
    return NextResponse.json(
      { error: 'Failed to get user', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/users/me
 * Update current user's settings (e.g., email signature)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { emailSignature } = body

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailSignature: emailSignature ?? null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true,
        branchId: true,
        emailSignature: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Failed to update user', details: error.message },
      { status: 500 }
    )
  }
}
