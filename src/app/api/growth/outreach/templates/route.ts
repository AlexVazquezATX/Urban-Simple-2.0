import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const channel = searchParams.get('channel')

    const templates = await prisma.contentTemplate.findMany({
      where: {
        companyId: user.companyId,
        ...(channel && channel !== 'all' && { channel }),
        isActive: true,
      },
      orderBy: {
        lastUsedAt: 'desc',
      },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, category, channel, subject, body: templateBody, variables, aiInstructions } = body

    if (!name || !channel || !templateBody) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const template = await prisma.contentTemplate.create({
      data: {
        companyId: user.companyId,
        createdById: user.id,
        name,
        category: category || 'general',
        channel,
        subject: subject || null,
        body: templateBody,
        variables: variables || [],
        aiInstructions: aiInstructions || null,
      },
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
