import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/checklists - List all checklist templates
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeLocations = searchParams.get('includeLocations') === 'true'

    const templates = await prisma.checklistTemplate.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
      },
      include: includeLocations
        ? {
            locations: {
              where: {
                isActive: true,
              },
              select: {
                id: true,
                name: true,
                client: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            _count: {
              select: {
                locations: true,
                serviceLogs: true,
              },
            },
          }
        : {
            _count: {
              select: {
                locations: true,
                serviceLogs: true,
              },
            },
          },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching checklist templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch checklist templates' },
      { status: 500 }
    )
  }
}

// POST /api/checklists - Create new checklist template
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, nameEs, description, sections, isActive = true } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Sections must be an array (can be empty for new templates)
    if (!Array.isArray(sections)) {
      return NextResponse.json(
        { error: 'Sections must be an array' },
        { status: 400 }
      )
    }

    // Validate sections structure (only if sections exist)
    for (const section of sections) {
      if (!section.id || !section.name || !Array.isArray(section.items)) {
        return NextResponse.json(
          { error: 'Invalid section structure. Each section must have an id, name, and items array.' },
          { status: 400 }
        )
      }
      for (const item of section.items) {
        if (!item.id || !item.text) {
          return NextResponse.json(
            { error: 'Invalid item structure. Each item must have an id and text.' },
            { status: 400 }
          )
        }
      }
    }

    const template = await prisma.checklistTemplate.create({
      data: {
        companyId: user.companyId,
        name: name.trim(),
        nameEs: nameEs?.trim() || null,
        description: description?.trim() || null,
        sections: sections as any, // Empty array is valid for new templates
        isActive,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error: any) {
    console.error('Error creating checklist template:', error)
    
    // Provide more detailed error messages
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A checklist template with this name already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create checklist template',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

