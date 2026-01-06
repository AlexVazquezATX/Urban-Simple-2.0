import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/checklist-library - List section types with their items
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sectionTypeId = searchParams.get('sectionTypeId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    if (sectionTypeId) {
      // Get items for a specific section type
      const sectionType = await prisma.checklistSectionType.findFirst({
        where: {
          id: sectionTypeId,
          ...(includeInactive ? {} : { isActive: true }),
        },
        include: {
          items: {
            where: {
              ...(includeInactive ? {} : { isActive: true }),
              // Include built-in items OR items for this company
              OR: [
                { isBuiltIn: true },
                { companyId: user.companyId },
              ],
            },
            orderBy: [
              { usageCount: 'desc' }, // Popular items first
              { text: 'asc' },
            ],
          },
        },
      })

      if (!sectionType) {
        return NextResponse.json(
          { error: 'Section type not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(sectionType)
    }

    // Get all section types with their items
    const sectionTypes = await prisma.checklistSectionType.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        // Include built-in section types OR company-specific ones
        OR: [
          { isBuiltIn: true },
          { companyId: user.companyId },
        ],
      },
      include: {
        items: {
          where: {
            ...(includeInactive ? {} : { isActive: true }),
            // Include built-in items OR items for this company
            OR: [
              { isBuiltIn: true },
              { companyId: user.companyId },
            ],
          },
          orderBy: [
            { usageCount: 'desc' },
            { text: 'asc' },
          ],
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    })

    return NextResponse.json(sectionTypes)
  } catch (error) {
    console.error('Error fetching checklist library:', error)
    return NextResponse.json(
      { error: 'Failed to fetch checklist library' },
      { status: 500 }
    )
  }
}

// POST /api/checklist-library - Add custom item to library (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and managers can add custom items
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin or Manager role required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      sectionTypeId,
      text,
      textEs,
      frequency = 'daily',
      requiresPhoto = false,
      priority = 'normal',
    } = body

    if (!sectionTypeId || !text) {
      return NextResponse.json(
        { error: 'sectionTypeId and text are required' },
        { status: 400 }
      )
    }

    // Verify section type exists and belongs to company or is built-in
    const sectionType = await prisma.checklistSectionType.findFirst({
      where: {
        id: sectionTypeId,
        OR: [
          { isBuiltIn: true },
          { companyId: user.companyId },
        ],
      },
    })

    if (!sectionType) {
      return NextResponse.json(
        { error: 'Section type not found' },
        { status: 404 }
      )
    }

    // Create custom item
    const item = await prisma.checklistItemLibrary.create({
      data: {
        sectionTypeId,
        companyId: user.companyId,
        text: text.trim(),
        textEs: textEs?.trim() || null,
        frequency,
        requiresPhoto,
        priority,
        isBuiltIn: false,
        isActive: true,
        usageCount: 0,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error: any) {
    console.error('Error creating checklist library item:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An item with this text already exists for this section' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create checklist library item' },
      { status: 500 }
    )
  }
}


