import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'

// POST /api/growth/prospects/check-duplicates - Check for duplicate company names
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyNames } = body

    if (!Array.isArray(companyNames) || companyNames.length === 0) {
      return NextResponse.json({ error: 'Company names array is required' }, { status: 400 })
    }

    // Find existing prospects with matching company names (case-insensitive)
    const existing = await prisma.prospect.findMany({
      where: {
        companyId: user.companyId,
        companyName: {
          in: companyNames.map((name: string) => name.trim()),
          mode: 'insensitive',
        },
      },
      select: {
        companyName: true,
      },
    })

    const duplicates = existing.map(p => p.companyName)

    return NextResponse.json({ duplicates })
  } catch (error) {
    console.error('Error checking duplicates:', error)
    return NextResponse.json(
      { error: 'Failed to check for duplicates' },
      { status: 500 }
    )
  }
}

