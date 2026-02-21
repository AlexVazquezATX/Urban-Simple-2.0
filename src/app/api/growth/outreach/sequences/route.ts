import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sequences = await prisma.outreachCampaign.findMany({
      where: {
        companyId: user.companyId,
        prospectId: null, // Only get sequences, not single-prospect campaigns
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(sequences)
  } catch (error) {
    console.error('Error fetching sequences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sequences' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, messages, startDate, endDate } = body

    if (!name || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const campaign = await prisma.outreachCampaign.create({
      data: {
        companyId: user.companyId,
        createdById: user.id,
        name,
        description: description || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: 'draft',
        messages: {
          create: messages.map((msg: any, index: number) => ({
            step: index + 1,
            delayDays: msg.delayDays || 0,
            channel: msg.channel,
            subject: msg.subject || null,
            body: msg.body,
            isAiGenerated: msg.isAiGenerated || false,
            aiPrompt: msg.aiPrompt || null,
            status: 'pending',
          })),
        },
      },
      include: {
        messages: true,
      },
    })

    return NextResponse.json(campaign)
  } catch (error) {
    console.error('Error creating sequence:', error)
    return NextResponse.json(
      { error: 'Failed to create sequence' },
      { status: 500 }
    )
  }
}
