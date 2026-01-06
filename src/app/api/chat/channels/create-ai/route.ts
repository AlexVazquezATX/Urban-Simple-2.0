import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { AI_PERSONAS, type AIPersona } from '@/lib/ai/prompts'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and super admins can create AI channels
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can create AI assistant channels' },
        { status: 403 }
      )
    }

    const { persona, languages = ['en'] } = await request.json()

    // Validate persona
    if (!persona || !AI_PERSONAS[persona as AIPersona]) {
      return NextResponse.json(
        { error: 'Invalid AI persona. Must be one of: hr, payroll, operations, time_off, general' },
        { status: 400 }
      )
    }

    const personaConfig = AI_PERSONAS[persona as AIPersona]

    // Create slug from persona
    const slug = `ai-${persona}`

    // Check if channel already exists
    const existing = await prisma.channel.findUnique({
      where: {
        companyId_slug: {
          companyId: user.companyId,
          slug,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'An AI assistant channel for this persona already exists' },
        { status: 400 }
      )
    }

    // Create the AI channel
    const channel = await prisma.channel.create({
      data: {
        companyId: user.companyId,
        name: `${personaConfig.aiName} (${personaConfig.name})`,
        slug,
        description: personaConfig.description,
        type: 'public', // AI channels are public by default
        isAiEnabled: true,
        aiPersona: persona,
        aiLanguages: languages,
        aiSystemPrompt: personaConfig.systemPrompt,
        createdById: user.id,
      },
    })

    // Get all users who should have access to this channel
    const allowedRoles = personaConfig.allowedRoles
    const usersToAdd = await prisma.user.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
        ...(allowedRoles && { role: { in: allowedRoles as any } }),
      },
      select: { id: true },
    })

    // Add all eligible users as members
    if (usersToAdd.length > 0) {
      await prisma.channelMember.createMany({
        data: usersToAdd.map((u) => ({
          channelId: channel.id,
          userId: u.id,
          role: 'member',
        })),
        skipDuplicates: true,
      })
    }

    return NextResponse.json({
      success: true,
      channel: {
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
        description: channel.description,
        aiPersona: channel.aiPersona,
        aiLanguages: channel.aiLanguages,
        icon: personaConfig.icon,
        membersAdded: usersToAdd.length,
      },
    })
  } catch (error) {
    console.error('Create AI channel error:', error)
    return NextResponse.json(
      { error: 'Failed to create AI assistant channel' },
      { status: 500 }
    )
  }
}

// GET endpoint to list available AI personas
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // All authenticated users can view available personas
    // Only admins can create channels (enforced in POST endpoint)

    // Get existing AI channels for this company
    const existingChannels = await prisma.channel.findMany({
      where: {
        companyId: user.companyId,
        isAiEnabled: true,
      },
      select: {
        aiPersona: true,
        slug: true,
        name: true,
        _count: {
          select: { members: true },
        },
      },
    })

    const existingPersonas = new Set(existingChannels.map((c) => c.aiPersona))

    // Format available personas
    const availablePersonas = Object.entries(AI_PERSONAS).map(([key, config]) => ({
      id: key,
      name: config.name,
      nameEs: config.nameEs,
      aiName: config.aiName,
      description: config.description,
      descriptionEs: config.descriptionEs,
      icon: config.icon,
      allowedRoles: config.allowedRoles,
      isCreated: existingPersonas.has(key),
    }))

    return NextResponse.json({
      personas: availablePersonas,
      userRole: user.role,
      existingChannels: existingChannels.map((c) => ({
        persona: c.aiPersona,
        name: c.name,
        slug: c.slug,
        memberCount: c._count.members,
      })),
    })
  } catch (error) {
    console.error('Get AI personas error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI personas' },
      { status: 500 }
    )
  }
}
