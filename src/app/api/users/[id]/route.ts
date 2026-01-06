import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users/[id]
 * Get a specific user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        associate: true,
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(targetUser)
  } catch (error: any) {
    console.error('Failed to fetch user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/users/[id]
 * Update a user
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update users (or users can update themselves)
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && user.id !== id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      displayName,
      phone,
      role,
      branchId,
      isActive,
      avatarUrl,
    } = body

    // Verify user exists and belongs to company
    const existing = await prisma.user.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user
    const updateData: any = {}
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (displayName !== undefined) updateData.displayName = displayName
    if (phone !== undefined) updateData.phone = phone
    if (role !== undefined) updateData.role = role
    if (branchId !== undefined) updateData.branchId = branchId
    if (isActive !== undefined) updateData.isActive = isActive
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error('Failed to update user:', error)
    return NextResponse.json(
      { error: 'Failed to update user', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/users/[id]
 * Delete (deactivate) a user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete users
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin role required' },
        { status: 403 }
      )
    }

    // Cannot delete yourself
    if (user.id === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Verify user exists and belongs to company
    const existing = await prisma.user.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user', details: error.message },
      { status: 500 }
    )
  }
}


