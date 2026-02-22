import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { prisma } from '@/lib/db'
import { enrichProspectData } from '@/lib/services/prospect-enricher'

// POST /api/growth/prospects/[id]/enrich - AI enrichment for prospect
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify prospect belongs to user's company
    const prospect = await prisma.prospect.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        contacts: true,
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    // Enrich using the extracted service
    const { externalData, aiEnrichment, googleData, yelpData } = await enrichProspectData({
      companyName: prospect.companyName,
      legalName: prospect.legalName,
      industry: prospect.industry,
      businessType: prospect.businessType,
      address: prospect.address,
      website: prospect.website,
      phone: prospect.phone,
      contacts: prospect.contacts.map((c) => ({
        firstName: c.firstName,
        lastName: c.lastName,
        title: c.title,
      })),
    })

    // Build update data
    const updateData: any = {
      aiEnriched: true,
      enrichmentDate: new Date(),
    }

    if (externalData.phone && !prospect.phone) {
      updateData.phone = externalData.phone
    }
    if (externalData.website && !prospect.website) {
      updateData.website = externalData.website
    }

    const priceLevel = externalData.googlePriceLevel || externalData.yelpPrice
    if (priceLevel && !prospect.priceLevel) {
      updateData.priceLevel = priceLevel
    }

    if (aiEnrichment.estimatedSize) updateData.estimatedSize = aiEnrichment.estimatedSize
    if (aiEnrichment.industry) updateData.industry = aiEnrichment.industry
    if (aiEnrichment.businessType && !prospect.businessType) updateData.businessType = aiEnrichment.businessType
    if (aiEnrichment.estimatedValue) updateData.estimatedValue = aiEnrichment.estimatedValue
    if (aiEnrichment.potentialValue) {
      updateData.priority =
        aiEnrichment.potentialValue === 'high'
          ? 'high'
          : aiEnrichment.potentialValue === 'low'
            ? 'low'
            : 'medium'
    }

    updateData.discoveryData = {
      ...((prospect.discoveryData as any) || {}),
      googlePlaces: googleData,
      yelp: yelpData,
      externalData,
      aiEnrichment,
      enrichedAt: new Date().toISOString(),
    }

    // Update prospect
    const updatedProspect = await prisma.prospect.update({
      where: { id },
      data: updateData,
      include: {
        contacts: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        activities: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Create activity log
    const enrichmentSummary = []
    if (googleData) enrichmentSummary.push(`Google: ${externalData.googleRating}/5 (${externalData.googleReviewCount} reviews)`)
    if (yelpData) enrichmentSummary.push(`Yelp: ${externalData.yelpRating}/5 (${externalData.yelpReviewCount} reviews)`)
    if (priceLevel) enrichmentSummary.push(`Price: ${priceLevel}`)
    if (externalData.phone && !prospect.phone) enrichmentSummary.push(`Found phone: ${externalData.phone}`)
    if (externalData.website && !prospect.website) enrichmentSummary.push(`Found website`)

    await prisma.prospectActivity.create({
      data: {
        prospectId: id,
        userId: user.id,
        type: 'note',
        title: 'AI Enrichment Completed',
        description:
          enrichmentSummary.length > 0
            ? `Data found: ${enrichmentSummary.join(', ')}. ${aiEnrichment.insights || ''}`
            : `AI analysis completed. ${aiEnrichment.insights || 'See enrichment data'}`,
        metadata: {
          externalData: externalData as any,
          aiEnrichment: aiEnrichment as any,
        },
      },
    })

    return NextResponse.json({
      prospect: updatedProspect,
      enrichment: {
        externalData,
        aiEnrichment,
      },
    })
  } catch (error: any) {
    console.error('Error enriching prospect:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to enrich prospect' },
      { status: 500 }
    )
  }
}
