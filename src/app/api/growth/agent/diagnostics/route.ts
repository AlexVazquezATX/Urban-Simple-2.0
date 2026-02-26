import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { prisma } from '@/lib/db'

// GET /api/growth/agent/diagnostics — Email search diagnostics
// Shows WHY prospects failed to find emails
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    // Get prospects that have been through email search
    const searched = await prisma.prospect.findMany({
      where: {
        companyId: user.companyId,
        aiEnriched: true,
      },
      select: {
        id: true,
        companyName: true,
        website: true,
        address: true,
        discoveryData: true,
        contacts: {
          select: {
            email: true,
            emailSource: true,
            emailConfidence: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })

    // Categorize prospects
    const results = {
      total: searched.length,
      searched: 0,
      notSearched: 0,
      withEmails: 0,
      withoutEmails: 0,
      failReasons: {} as Record<string, number>,
      hasWebsite: 0,
      missingWebsite: 0,
      hasCity: 0,
      missingCity: 0,
      prospects: [] as Array<{
        name: string
        website: string | null
        city: string | null
        searched: boolean
        emailFound: boolean
        emailDiagnostics: any
        contacts: number
        contactsWithEmail: number
      }>,
    }

    for (const p of searched) {
      const dd = p.discoveryData as any
      const address = p.address as any
      const city = address?.city || null
      const searched = !!dd?.emailSearchedAt
      const emailContacts = p.contacts.filter((c) => c.email)

      if (p.website) results.hasWebsite++
      else results.missingWebsite++

      if (city) results.hasCity++
      else results.missingCity++

      if (searched) {
        results.searched++
        if (emailContacts.length > 0) {
          results.withEmails++
        } else {
          results.withoutEmails++
          const reason = dd?.emailDiagnostics?.failReason || dd?.emailSearchResult || 'unknown'
          results.failReasons[reason] = (results.failReasons[reason] || 0) + 1
        }
      } else {
        results.notSearched++
      }

      results.prospects.push({
        name: p.companyName,
        website: p.website,
        city,
        searched,
        emailFound: emailContacts.length > 0,
        emailDiagnostics: dd?.emailDiagnostics || null,
        contacts: p.contacts.length,
        contactsWithEmail: emailContacts.length,
      })
    }

    // Also check Hunter API key status (don't expose the key)
    const hunterKeySet = !!process.env.HUNTER_API_KEY

    return NextResponse.json({
      hunterApiKeyConfigured: hunterKeySet,
      summary: {
        total: results.total,
        searched: results.searched,
        notSearched: results.notSearched,
        withEmails: results.withEmails,
        withoutEmails: results.withoutEmails,
        hasWebsite: results.hasWebsite,
        missingWebsite: results.missingWebsite,
        hasCity: results.hasCity,
        missingCity: results.missingCity,
      },
      failReasons: results.failReasons,
      prospects: results.prospects,
    })
  } catch (error: any) {
    console.error('Error fetching diagnostics:', error)
    return NextResponse.json(
      { error: `Failed to fetch diagnostics: ${error.message}` },
      { status: 500 }
    )
  }
}
