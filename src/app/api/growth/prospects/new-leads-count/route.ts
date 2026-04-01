import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const count = await prisma.prospect.count({
      where: {
        companyId: user.companyId,
        status: 'new',
        source: 'website',
        tags: { has: 'Website Lead' },
      },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Failed to fetch new leads count:', error)
    return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 })
  }
}
