import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { prisma } from '@/lib/db'

// GET /api/growth/discovery/debug-prospects — Show prospect state for debugging email discovery
// Add ?cleanup=true to deduplicate contacts
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // If ?run=enrich or ?run=find_emails, trigger that stage directly
  const runStage = request.nextUrl.searchParams.get('run')
  if (runStage && ['enrich', 'find_emails', 'score', 'generate_outreach'].includes(runStage)) {
    // Diagnostic: check what the query would find before running
    const config = await prisma.growthAgentConfig.findUnique({
      where: { companyId: user.companyId },
    })
    const directCount = await prisma.prospect.count({
      where: {
        companyId: user.companyId,
        status: 'new',
        aiEnriched: false,
      },
    })

    // Force config to correct values right before running
    await prisma.growthAgentConfig.update({
      where: { companyId: user.companyId },
      data: { batchSize: 10, processingMode: 'all' },
    })

    const { runAgentCycle } = await import('@/lib/services/growth-agent')
    const result = await runAgentCycle(user.companyId, {
      forceStage: runStage as any,
      manualTrigger: true,
    })
    return NextResponse.json({
      ...result,
      _debug: {
        companyId: user.companyId,
        configFixedTo: 'batchSize=10, processingMode=all',
        directQueryCount: directCount,
      },
    })
  }

  // If ?fixconfig=true, update agent config for testing
  const fixConfig = request.nextUrl.searchParams.get('fixconfig') === 'true'
  if (fixConfig) {
    const updated = await prisma.growthAgentConfig.update({
      where: { companyId: user.companyId },
      data: {
        batchSize: 10,
        processingMode: 'all',
      },
    })
    return NextResponse.json({
      success: true,
      message: 'Config updated: batchSize=10, processingMode=all',
      config: { batchSize: updated.batchSize, processingMode: updated.processingMode },
    })
  }

  // If ?cleanup=true, deduplicate contacts first
  const cleanup = request.nextUrl.searchParams.get('cleanup') === 'true'
  if (cleanup) {
    const allProspects = await prisma.prospect.findMany({
      where: { companyId: user.companyId },
      include: { contacts: { orderBy: { createdAt: 'asc' } } },
    })

    let totalDeleted = 0
    const cleaned: string[] = []

    for (const prospect of allProspects) {
      const seen = new Map<string, string>()
      const toDelete: string[] = []

      for (const contact of prospect.contacts) {
        const key = `${contact.firstName.toLowerCase()}-${contact.lastName.toLowerCase()}`
        const existingId = seen.get(key)

        if (!existingId) {
          seen.set(key, contact.id)
        } else {
          if (contact.email && !prospect.contacts.find((c) => c.id === existingId)?.email) {
            toDelete.push(existingId)
            seen.set(key, contact.id)
          } else {
            toDelete.push(contact.id)
          }
        }
      }

      if (toDelete.length > 0) {
        await prisma.prospectContact.deleteMany({
          where: { id: { in: toDelete } },
        })
        totalDeleted += toDelete.length
        cleaned.push(`${prospect.companyName}: removed ${toDelete.length} duplicates`)
      }
    }

    return NextResponse.json({ success: true, totalDeleted, cleaned })
  }

  const prospects = await prisma.prospect.findMany({
    where: { companyId: user.companyId },
    include: {
      contacts: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          emailConfidence: true,
          emailSource: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const summary = prospects.map((p) => {
    const address = p.address as any
    return {
      name: p.companyName,
      website: p.website || '(none)',
      domain: p.website
        ? p.website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
        : '(no website)',
      city: address?.city || '(no city)',
      state: address?.state || '(no state)',
      aiEnriched: p.aiEnriched,
      status: p.status,
      contacts: p.contacts.map((c) => ({
        name: `${c.firstName} ${c.lastName}`.trim(),
        email: c.email || '(none)',
        confidence: c.emailConfidence,
        source: c.emailSource,
        title: c.title,
      })),
      contactCount: p.contacts.length,
      hasEmail: p.contacts.some((c) => c.email),
    }
  })

  // Check what the enrich and find_emails queries would actually match
  const enrichReady = await prisma.prospect.count({
    where: { companyId: user.companyId, status: 'new', aiEnriched: false },
  })
  const emailReady = await prisma.prospect.count({
    where: {
      companyId: user.companyId,
      aiEnriched: true,
      contacts: { none: { email: { not: null } } },
    },
  })

  const stats = {
    total: summary.length,
    withWebsite: summary.filter((p) => p.website !== '(none)').length,
    withEmail: summary.filter((p) => p.hasEmail).length,
    enriched: summary.filter((p) => p.aiEnriched).length,
    readyForEnrich: enrichReady,
    readyForFindEmails: emailReady,
  }

  return NextResponse.json({ stats, prospects: summary })
}

// POST /api/growth/discovery/debug-prospects — Cleanup duplicate contacts
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find all prospects for this company
  const prospects = await prisma.prospect.findMany({
    where: { companyId: user.companyId },
    include: { contacts: { orderBy: { createdAt: 'asc' } } },
  })

  let totalDeleted = 0
  const cleaned: string[] = []

  for (const prospect of prospects) {
    // Group contacts by firstName+lastName
    const seen = new Map<string, string>() // key -> id to keep (first one, or the one with email)
    const toDelete: string[] = []

    for (const contact of prospect.contacts) {
      const key = `${contact.firstName.toLowerCase()}-${contact.lastName.toLowerCase()}`
      const existing = seen.get(key)

      if (!existing) {
        seen.set(key, contact.id)
      } else {
        // Duplicate — keep the one with email, delete the other
        if (contact.email && !prospect.contacts.find((c) => c.id === existing)?.email) {
          // This one has email, swap: delete the old one, keep this one
          toDelete.push(existing)
          seen.set(key, contact.id)
        } else {
          toDelete.push(contact.id)
        }
      }
    }

    if (toDelete.length > 0) {
      await prisma.prospectContact.deleteMany({
        where: { id: { in: toDelete } },
      })
      totalDeleted += toDelete.length
      cleaned.push(`${prospect.companyName}: removed ${toDelete.length} duplicates`)
    }
  }

  return NextResponse.json({
    success: true,
    totalDeleted,
    cleaned,
  })
}
