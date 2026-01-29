import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { findPersonEmail } from '@/lib/services/prospect-finder'
import { SearchMethod } from '@/lib/types/email-prospecting'

// POST /api/growth/email-prospecting/search/person - Find a specific person's email
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, domain, method, verifyEmail } = body

    if (!firstName || !lastName || !domain) {
      return NextResponse.json(
        { error: 'firstName, lastName, and domain are required' },
        { status: 400 }
      )
    }

    const prospect = await findPersonEmail({
      firstName,
      lastName,
      domain,
      method: (method as SearchMethod) || 'all',
      verifyEmail: verifyEmail !== false,
    })

    // Log API usage
    await prisma.emailProspectingLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        provider: prospect?.source || method || 'pattern',
        endpoint: 'person_search',
        queryParams: { firstName, lastName, domain, method },
        resultsCount: prospect ? 1 : 0,
        responseTimeMs: Date.now() - startTime,
        success: true,
      },
    })

    if (!prospect) {
      return NextResponse.json({
        data: null,
        message: 'No email found for this person',
      })
    }

    return NextResponse.json({ data: prospect })
  } catch (error) {
    console.error('Person search error:', error)

    // Try to log error
    try {
      const user = await getCurrentUser()
      if (user) {
        await prisma.emailProspectingLog.create({
          data: {
            companyId: user.companyId,
            userId: user.id,
            provider: 'pattern',
            endpoint: 'person_search',
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            responseTimeMs: Date.now() - startTime,
          },
        })
      }
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}
