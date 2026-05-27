import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import {
  generateOutreachMessage,
  determineBestChannel,
  type ProspectData,
} from '@/lib/ai/outreach-composer'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      prospectIds,
      templateId,
      campaignId,
      // Optional overrides — when Cassie pre-composes a draft (so the user can
      // edit subject/body in the chat preview before applying), the route
      // passes the finalized text here. If both are present we skip the
      // composer entirely and persist exactly what came in.
      subjectOverride,
      bodyOverride,
      channelOverride,
      // Optional compose hints — when no override is provided, these tune the
      // composer call. Empty/missing means use defaults.
      composeInstructions,
      tone: toneInput,
      purpose: purposeInput,
    } = body as {
      prospectIds?: string[]
      templateId?: string
      campaignId?: string
      subjectOverride?: string
      bodyOverride?: string
      channelOverride?: string
      composeInstructions?: string
      tone?: string
      purpose?: string
    }

    if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json(
        { error: 'Prospect IDs required' },
        { status: 400 }
      )
    }

    const allowedTones = new Set(['professional', 'friendly', 'casual', 'warm'])
    const allowedPurposes = new Set(['cold_outreach', 'follow_up', 're_engagement'])
    const tone = toneInput && allowedTones.has(toneInput) ? (toneInput as any) : 'friendly'
    const purpose = purposeInput && allowedPurposes.has(purposeInput) ? (purposeInput as any) : 'cold_outreach'
    const trimmedInstructions = typeof composeInstructions === 'string' ? composeInstructions.trim() : ''
    const hasOverride = typeof subjectOverride === 'string' && typeof bodyOverride === 'string'
      && bodyOverride.trim().length > 0

    // Resolve campaign — auto-create if not provided or 'auto'
    let resolvedCampaignId = campaignId
    if (!campaignId || campaignId === 'auto') {
      // Find existing active campaign or create one
      const existing = await prisma.outreachCampaign.findFirst({
        where: { companyId: user.companyId, status: 'active' },
        orderBy: { createdAt: 'desc' },
      })

      if (existing) {
        resolvedCampaignId = existing.id
      } else {
        const created = await prisma.outreachCampaign.create({
          data: {
            companyId: user.companyId,
            createdById: user.id,
            name: `Outreach Campaign — ${new Date().toLocaleDateString()}`,
            description: 'Auto-created campaign for outreach generation',
            status: 'active',
          },
        })
        resolvedCampaignId = created.id
      }
    } else {
      // Verify provided campaign exists and belongs to user
      const campaign = await prisma.outreachCampaign.findFirst({
        where: { id: campaignId, companyId: user.companyId },
      })
      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }
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
      include: { contacts: true },
    })

    const results = []

    // Generate messages for each prospect
    for (const prospect of prospects) {
      try {
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

        const channel = (channelOverride && typeof channelOverride === 'string'
          ? channelOverride
          : determineBestChannel(prospectData)) as any

        // Two paths:
        //  1. Overrides provided — skip composer, persist subjectOverride +
        //     bodyOverride verbatim. This is what Cassie uses after the chat
        //     route pre-composes and the user edits in the preview card.
        //  2. No override — compose with the provided tone/purpose/instructions
        //     (or defaults). This is the legacy "auto-draft a batch" path.
        let finalSubject: string | undefined
        let finalBody: string
        if (hasOverride) {
          finalSubject = subjectOverride
          finalBody = bodyOverride!
        } else {
          const generated = await generateOutreachMessage({
            channel,
            prospect: prospectData,
            tone,
            purpose,
            customInstructions: trimmedInstructions || undefined,
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
          finalSubject = generated.subject
          finalBody = generated.body
        }

        const message = await prisma.outreachMessage.create({
          data: {
            campaignId: resolvedCampaignId,
            prospectId: prospect.id,
            step: 1,
            delayDays: 0,
            channel,
            subject: finalSubject,
            body: finalBody,
            isAiGenerated: true,
            approvalStatus: 'pending',
            status: 'pending',
          },
        })

        results.push({
          prospectId: prospect.id,
          prospectName: prospect.companyName,
          messageId: message.id,
          channel,
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
