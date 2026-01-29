import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { findProspectsAtCompany } from '@/lib/services/prospect-finder'
import { SearchMethod } from '@/lib/types/email-prospecting'

// POST /api/growth/email-prospecting/search/domain - Search for contacts at a company domain
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { domain, titles, seniorities, method, limit, verifyEmails } = body

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    console.log(`[Domain Search] Searching for contacts at: ${domain}`)

    const prospects = await findProspectsAtCompany({
      domain,
      method: (method as SearchMethod) || 'apollo',
      titles,
      seniorities,
      limit: limit || 25,
      verifyEmails: verifyEmails || false,
    })

    console.log(`[Domain Search] Found ${prospects.length} prospects at ${domain}`)
    if (prospects.length > 0) {
      console.log('[Domain Search] First result:', JSON.stringify(prospects[0], null, 2))
    }

    // Log API usage
    await prisma.emailProspectingLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        provider: method || 'apollo',
        endpoint: 'domain_search',
        queryParams: { domain, titles, seniorities, method, limit },
        resultsCount: prospects.length,
        responseTimeMs: Date.now() - startTime,
        success: true,
      },
    })

    return NextResponse.json({
      data: prospects,
      meta: {
        count: prospects.length,
        domain,
        method: method || 'apollo',
      },
    })
  } catch (error) {
    console.error('Domain search error:', error)

    // Try to log error
    try {
      const user = await getCurrentUser()
      if (user) {
        await prisma.emailProspectingLog.create({
          data: {
            companyId: user.companyId,
            userId: user.id,
            provider: 'apollo',
            endpoint: 'domain_search',
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
