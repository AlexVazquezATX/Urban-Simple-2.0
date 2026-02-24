import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { searchDomain } from '@/lib/services/hunter-service'

// GET /api/growth/discovery/hunter-search?domain=mmlhospitality.com
// Test endpoint to see what Hunter finds for a given domain
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = request.nextUrl.searchParams
    const domain = params.get('domain')
    const limit = Math.min(parseInt(params.get('limit') || '10', 10), 100)
    const type = (params.get('type') as 'personal' | 'generic') || undefined
    const seniority = params.get('seniority')?.split(',') || undefined
    const department = params.get('department')?.split(',') || undefined

    if (!domain) {
      return NextResponse.json(
        { error: 'domain parameter required. Example: ?domain=mmlhospitality.com' },
        { status: 400 }
      )
    }

    const result = await searchDomain(domain, {
      limit,
      type,
      seniority,
      department,
    })

    if (!result) {
      return NextResponse.json({
        domain,
        error: 'No results — Hunter API key may not be configured or domain not found',
      })
    }

    // Format for easy reading
    const contacts = (result.emails || []).map((e) => ({
      name: [e.first_name, e.last_name].filter(Boolean).join(' ') || null,
      email: e.value,
      confidence: e.confidence,
      type: e.type,
      position: e.position,
      seniority: e.seniority,
      department: e.department,
      phone: e.phone_number,
      linkedin: e.linkedin,
    }))

    return NextResponse.json({
      domain: result.domain,
      organization: result.organization,
      industry: result.industry,
      pattern: result.pattern,
      total_emails: contacts.length,
      contacts,
    })
  } catch (error: any) {
    console.error('Hunter search error:', error)
    return NextResponse.json(
      { error: error.message || 'Hunter search failed' },
      { status: 500 }
    )
  }
}
