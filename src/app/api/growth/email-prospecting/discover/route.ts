import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { discoverOwners, toProspectSearchResults } from '@/lib/services/owner-discovery'

// POST /api/growth/email-prospecting/discover
// Discover business owners and their emails
// This is the BEST method for hospitality businesses
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { businessName, city, state, website } = body

    if (!businessName || !city) {
      return NextResponse.json(
        { error: 'businessName and city are required' },
        { status: 400 }
      )
    }

    console.log(`[Owner Discovery API] Discovering owners for: ${businessName} in ${city}, ${state || 'unknown'}`)

    // Run owner discovery
    const discoveryResult = await discoverOwners({
      businessName,
      city,
      state,
      website,
      includeHospitalityFallback: true,
    })

    // Convert to standard prospect format for consistency
    const prospects = toProspectSearchResults(discoveryResult)

    // Log API usage
    await prisma.emailProspectingLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        provider: 'discover',
        endpoint: 'owner_discovery',
        queryParams: { businessName, city, state, website },
        resultsCount: prospects.length,
        success: true,
      },
    })

    return NextResponse.json({
      data: prospects,
      discovery: {
        owners: discoveryResult.owners,
        businessInfo: discoveryResult.businessInfo,
        hospitalityEmails: discoveryResult.hospitalityEmails,
      },
      meta: {
        count: prospects.length,
        ownersFound: discoveryResult.meta.ownerNamesFound.length,
        emailsFound: discoveryResult.meta.emailsFound.length,
        sources: {
          yelp: discoveryResult.meta.yelpFound,
          google: discoveryResult.meta.googleFound,
          hunter: discoveryResult.meta.hunterFound,
        },
      },
    })
  } catch (error) {
    console.error('[Owner Discovery API] Error:', error)

    // Log failure
    try {
      const user = await getCurrentUser()
      if (user) {
        await prisma.emailProspectingLog.create({
          data: {
            companyId: user.companyId,
            userId: user.id,
            provider: 'discover',
            endpoint: 'owner_discovery',
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      }
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Discovery failed' },
      { status: 500 }
    )
  }
}
