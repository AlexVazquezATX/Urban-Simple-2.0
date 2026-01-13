import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  generateOutreachMessage,
  determineBestChannel,
  type ProspectData,
  type ComposerOptions,
} from '@/lib/ai/outreach-composer'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      prospectId,
      channel,
      templateId,
      tone = 'friendly',
      purpose = 'cold_outreach',
      customInstructions,
    } = body

    if (!prospectId) {
      return NextResponse.json(
        { error: 'Prospect ID required' },
        { status: 400 }
      )
    }

    // Fetch prospect with all related data
    const prospect = await prisma.prospect.findUnique({
      where: {
        id: prospectId,
        companyId: user.companyId,
      },
      include: {
        contacts: true,
      },
    })

    if (!prospect) {
      return NextResponse.json(
        { error: 'Prospect not found' },
        { status: 404 }
      )
    }

    // Build prospect data for AI
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

    // Determine channel if not specified
    const finalChannel = channel || determineBestChannel(prospectData)

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

    // Build composer options
    const options: ComposerOptions = {
      channel: finalChannel as any,
      prospect: prospectData,
      tone: tone as any,
      purpose: purpose as any,
      customInstructions,
    }

    if (template) {
      options.template = {
        name: template.name,
        category: template.category,
        channel: template.channel,
        subject: template.subject || undefined,
        body: template.body,
        variables: template.variables,
        aiInstructions: template.aiInstructions || undefined,
      }
    }

    // Generate message
    const generated = await generateOutreachMessage(options)

    return NextResponse.json({
      success: true,
      message: {
        channel: generated.channel,
        subject: generated.subject,
        body: generated.body,
        personalizationNotes: generated.personalizationNotes,
      },
    })
  } catch (error) {
    console.error('Error generating outreach message:', error)
    return NextResponse.json(
      { error: 'Failed to generate outreach message' },
      { status: 500 }
    )
  }
}
