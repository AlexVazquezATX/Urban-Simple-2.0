import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/channels
 * Fetch all channels for the current user's company
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Get user from session/auth
    // For now, we'll fetch all channels from the first company
    const company = await prisma.company.findFirst()

    if (!company) {
      return NextResponse.json(
        { error: 'No company found. Please create a company first.' },
        { status: 404 }
      )
    }

    const channels = await prisma.channel.findMany({
      where: {
        companyId: company.id,
        isArchived: false,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        type: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      channels,
    })
  } catch (error: any) {
    console.error('Failed to fetch channels:', error)
    return NextResponse.json(
      { error: 'Failed to fetch channels', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chat/channels
 * Create a new channel
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, type = 'public' } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Channel name is required' },
        { status: 400 }
      )
    }

    // TODO: Get user from session/auth
    const company = await prisma.company.findFirst()
    const user = await prisma.user.findFirst()

    if (!company || !user) {
      return NextResponse.json(
        { error: 'Company or user not found' },
        { status: 404 }
      )
    }

    // Create slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check if slug already exists
    const existingChannel = await prisma.channel.findFirst({
      where: {
        companyId: company.id,
        slug,
      },
    })

    if (existingChannel) {
      return NextResponse.json(
        { error: 'A channel with this name already exists' },
        { status: 409 }
      )
    }

    // Create channel
    const channel = await prisma.channel.create({
      data: {
        companyId: company.id,
        name: name.trim(),
        slug,
        description: description?.trim(),
        type,
        createdById: user.id,
      },
    })

    // Add creator as channel member
    await prisma.channelMember.create({
      data: {
        channelId: channel.id,
        userId: user.id,
        role: 'owner',
      },
    })

    return NextResponse.json({
      success: true,
      channel,
    })
  } catch (error: any) {
    console.error('Failed to create channel:', error)
    return NextResponse.json(
      { error: 'Failed to create channel', details: error.message },
      { status: 500 }
    )
  }
}
