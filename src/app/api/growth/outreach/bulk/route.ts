import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { prospectIds, channel, subject, body: messageBody } = body

    if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one prospect' },
        { status: 400 }
      )
    }

    if (!channel || !messageBody) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (channel === 'email' && !subject) {
      return NextResponse.json(
        { error: 'Email subject is required' },
        { status: 400 }
      )
    }

    // Verify all prospects belong to user's company
    const prospects = await prisma.prospect.findMany({
      where: {
        id: { in: prospectIds },
        companyId: user.companyId,
      },
      include: {
        contacts: {
          take: 1,
        },
      },
    })

    if (prospects.length !== prospectIds.length) {
      return NextResponse.json(
        { error: 'Some prospects not found' },
        { status: 404 }
      )
    }

    // Create bulk campaign
    const campaign = await prisma.outreachCampaign.create({
      data: {
        companyId: user.companyId,
        createdById: user.id,
        name: `Bulk ${channel} - ${new Date().toLocaleDateString()}`,
        description: `Bulk ${channel} to ${prospectIds.length} prospects`,
        status: 'active',
        targetCriteria: {
          prospectIds,
        },
      },
    })

    // Create messages for each prospect
    let sent = 0
    for (const prospect of prospects) {
      try {
        // Replace variables in message
        let personalizedBody = messageBody
        let personalizedSubject = subject || ''

        if (prospect.companyName) {
          personalizedBody = personalizedBody.replace(/\{\{company_name\}\}/g, prospect.companyName)
          personalizedSubject = personalizedSubject.replace(/\{\{company_name\}\}/g, prospect.companyName)
        }

        const contact = prospect.contacts[0]
        if (contact) {
          if (contact.firstName) {
            personalizedBody = personalizedBody.replace(/\{\{contact_first_name\}\}/g, contact.firstName)
            personalizedSubject = personalizedSubject.replace(/\{\{contact_first_name\}\}/g, contact.firstName)
          }
        }

        // Replace your_name with user's name
        personalizedBody = personalizedBody.replace(/\{\{your_name\}\}/g, `${user.firstName} ${user.lastName}`)
        personalizedSubject = personalizedSubject.replace(/\{\{your_name\}\}/g, `${user.firstName} ${user.lastName}`)

        // Create message
        await prisma.outreachMessage.create({
          data: {
            campaignId: campaign.id,
            prospectId: prospect.id,
            step: 1,
            delayDays: 0,
            channel,
            subject: channel === 'email' ? personalizedSubject : null,
            body: personalizedBody,
            status: 'pending',
            scheduledAt: new Date(), // Send immediately, but stagger in processing
          },
        })

        // Log activity
        await prisma.prospectActivity.create({
          data: {
            prospectId: prospect.id,
            userId: user.id,
            type: channel,
            channel,
            title: `Bulk ${channel} sent`,
            description: personalizedBody.substring(0, 200),
            subject: channel === 'email' ? personalizedSubject : null,
            messageBody: personalizedBody,
            sentAt: new Date(),
            completedAt: new Date(),
          },
        })

        sent++
      } catch (error) {
        console.error(`Error processing prospect ${prospect.id}:`, error)
      }
    }

    return NextResponse.json({ success: true, sent, total: prospectIds.length })
  } catch (error) {
    console.error('Error sending bulk messages:', error)
    return NextResponse.json(
      { error: 'Failed to send bulk messages' },
      { status: 500 }
    )
  }
}
