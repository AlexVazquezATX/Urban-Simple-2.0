import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/checklists/[id] - Get checklist template details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const template = await prisma.checklistTemplate.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
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
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Checklist template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching checklist template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch checklist template' },
      { status: 500 }
    )
  }
}

// PUT /api/checklists/[id] - Update checklist template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify template belongs to user's company
    const existing = await prisma.checklistTemplate.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Checklist template not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, nameEs, description, sections, isActive } = body

    // Validate sections if provided
    if (sections && Array.isArray(sections)) {
      for (const section of sections) {
        if (!section.id || !section.name || !Array.isArray(section.items)) {
          return NextResponse.json(
            { error: 'Invalid section structure' },
            { status: 400 }
          )
        }
        for (const item of section.items) {
          if (!item.id || !item.text) {
            return NextResponse.json(
              { error: 'Invalid item structure' },
              { status: 400 }
            )
          }
        }
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (nameEs !== undefined) updateData.nameEs = nameEs?.trim() || null
    if (description !== undefined) updateData.description = description?.trim() || null
    if (sections !== undefined) updateData.sections = sections as any
    if (isActive !== undefined) updateData.isActive = isActive

    const template = await prisma.checklistTemplate.update({
      where: {
        id,
      },
      data: updateData,
    })

    return NextResponse.json(template)
  } catch (error: any) {
    console.error('Error updating checklist template:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A checklist template with this name already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to update checklist template',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/checklists/[id] - Delete checklist template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify template belongs to user's company
    const existing = await prisma.checklistTemplate.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        _count: {
          select: {
            locations: true,
            serviceLogs: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Checklist template not found' },
        { status: 404 }
      )
    }

    // Check if template is in use
    if (existing._count.locations > 0 || existing._count.serviceLogs > 0) {
      // Soft delete by setting isActive to false
      await prisma.checklistTemplate.update({
        where: {
          id,
        },
        data: {
          isActive: false,
        },
      })
    } else {
      // Hard delete if not in use
      await prisma.checklistTemplate.delete({
        where: {
          id,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting checklist template:', error)
    return NextResponse.json(
      { error: 'Failed to delete checklist template' },
      { status: 500 }
    )
  }
}

