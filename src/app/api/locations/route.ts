import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/locations - List all locations
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locations = await prisma.location.findMany({
      where: {
        client: {
          companyId: user.companyId,
          ...(user.branchId && { branchId: user.branchId }),
        },
        isActive: true,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: [
        { client: { name: 'asc' } },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(locations)
  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    )
  }
}


