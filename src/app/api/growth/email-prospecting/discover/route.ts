import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { discoverOwners, toProspectSearchResults } from '@/lib/services/owner-discovery'

// POST /api/growth/email-prospecting/discover
// Discover business owners and their emails
// This is the BEST method for hospitality businesses
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
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

    // Count real people (not hospitality patterns)
    const realPeopleCount = discoveryResult.owners.length
    const realEmailsCount = discoveryResult.owners.filter(o => o.email).length

    return NextResponse.json({
      // data contains ONLY real people (from Yelp, Google, Hunter, Apollo)
      data: prospects,
      discovery: {
        owners: discoveryResult.owners,
        businessInfo: discoveryResult.businessInfo,
        // Hospitality emails are SUGGESTIONS to try, not real contacts
        hospitalityEmails: discoveryResult.hospitalityEmails,
      },
      meta: {
        count: prospects.length,
        realPeopleFound: realPeopleCount,
        realEmailsFound: realEmailsCount,
        hospitalitySuggestionsCount: discoveryResult.hospitalityEmails.length,
        ownersFound: discoveryResult.meta.ownerNamesFound.length,
        emailsFound: discoveryResult.meta.emailsFound.length,
        sources: {
          yelp: discoveryResult.meta.yelpFound,
          google: discoveryResult.meta.googleFound,
          hunter: discoveryResult.meta.hunterFound,
          apollo: discoveryResult.meta.apolloFound,
        },
      },
    })
  } catch (error) {
    console.error('[Owner Discovery API] Error:', error)

    // Log failure
    try {
      const user = await getAuthenticatedUser(request)
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
