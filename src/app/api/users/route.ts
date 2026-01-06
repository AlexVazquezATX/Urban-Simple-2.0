import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users
 * Get all users in the company
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const role = searchParams.get('role') // Filter by role

    const users = await prisma.user.findMany({
      where: {
        companyId: user.companyId,
        ...(includeInactive ? {} : { isActive: true }),
        ...(role ? { role: role as any } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        lastLogin: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdAt: true,
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

/**
 * POST /api/users
 * Create a new team member
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can create users
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin role required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      email,
      firstName,
      lastName,
      displayName,
      phone,
      role,
      branchId,
      password, // Optional - if provided, will create Supabase auth user
    } = body

    if (!email || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'email, firstName, lastName, and role are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

    // If password provided, create Supabase auth user
    let authId: string | undefined
    if (password) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          })

        if (authError) {
          console.error('Failed to create auth user:', authError)
          return NextResponse.json(
            { error: 'Failed to create authentication user', details: authError.message },
            { status: 500 }
          )
        }

        authId = authData.user.id
      } catch (error: any) {
        console.error('Auth creation error:', error)
        return NextResponse.json(
          { error: 'Failed to create authentication user', details: error.message },
          { status: 500 }
        )
      }
    }

    // Create user
    const newUser = await prisma.user.create({
      data: {
        companyId: user.companyId,
        branchId: branchId || user.branchId || null,
        email,
        firstName,
        lastName,
        displayName: displayName || `${firstName} ${lastName}`,
        phone: phone || null,
        role: role as any,
        isActive: true,
        authId: authId || undefined,
      },
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

    // If associate, create associate record
    if (role === 'ASSOCIATE') {
      await prisma.associate.create({
        data: {
          userId: newUser.id,
          onboardingStatus: 'pending',
          totalPoints: 0,
        },
      })
    }

    return NextResponse.json(newUser, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create user:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create user', details: error.message },
      { status: 500 }
    )
  }
}
