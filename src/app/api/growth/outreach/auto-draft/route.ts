import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  generateOutreachMessage,
  determineBestChannel,
  type ProspectData,
} from '@/lib/ai/outreach-composer'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { prospectIds, templateId, campaignId } = body

    if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json(
        { error: 'Prospect IDs required' },
        { status: 400 }
      )
    }

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID required' },
        { status: 400 }
      )
    }

    // Verify campaign exists and belongs to user
    const campaign = await prisma.outreachCampaign.findFirst({
      where: {
        id: campaignId,
        companyId: user.companyId,
      },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Fetch template if provided
    let template = null
    if (templateId) {
      template = await prisma.contentTemplate.findFirst({
        where: {
          id: templateId,
          companyId: user.companyId,
          isActive: true,
        },
      })
    }

    // Fetch prospects
    const prospects = await prisma.prospect.findMany({
      where: {
        id: { in: prospectIds },
        companyId: user.companyId,
      },
      include: {
        contacts: true,
      },
    })

    const results = []

    // Generate messages for each prospect
    for (const prospect of prospects) {
      try {
        // Build prospect data
        const prospectData: ProspectData = {
          companyName: prospect.companyName,
          businessType: prospect.businessType || undefined,
          industry: prospect.industry || undefined,
          address: prospect.address as any,
          website: prospect.website || undefined,
          priceLevel: prospect.priceLevel || undefined,
          contacts: prospect.contacts.map((c) => ({
            firstName: c.firstName,
            lastName: c.lastName,
            title: c.title || undefined,
            email: c.email || undefined,
          })),
          notes: prospect.notes || undefined,
          aiScore: prospect.aiScore || undefined,
          aiScoreReason: prospect.aiScoreReason || undefined,
        }

        // Determine best channel
        const channel = determineBestChannel(prospectData)

        // Generate message
        const generated = await generateOutreachMessage({
          channel: channel as any,
          prospect: prospectData,
          tone: 'friendly',
          purpose: 'cold_outreach',
          template: template
            ? {
                name: template.name,
                category: template.category,
                channel: template.channel,
                subject: template.subject || undefined,
                body: template.body,
                variables: template.variables,
                aiInstructions: template.aiInstructions || undefined,
              }
            : undefined,
        })

        // Create outreach message (step 1, pending approval)
        const message = await prisma.outreachMessage.create({
          data: {
            campaignId,
            prospectId: prospect.id,
            step: 1,
            delayDays: 0,
            channel: generated.channel,
            subject: generated.subject,
            body: generated.body,
            isAiGenerated: true,
            approvalStatus: 'pending',
            status: 'pending',
          },
        })

        results.push({
          prospectId: prospect.id,
          prospectName: prospect.companyName,
          messageId: message.id,
          channel: generated.channel,
          success: true,
        })
      } catch (error) {
        console.error(`Error generating message for prospect ${prospect.id}:`, error)
        results.push({
          prospectId: prospect.id,
          prospectName: prospect.companyName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter((r) => r.success).length

    return NextResponse.json({
      success: true,
      generated: successCount,
      total: results.length,
      results,
    })
  } catch (error) {
    console.error('Error auto-drafting messages:', error)
    return NextResponse.json(
      { error: 'Failed to auto-draft messages' },
      { status: 500 }
    )
  }
}
