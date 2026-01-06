import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST /api/checklists/[id]/duplicate - Duplicate a checklist template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'name is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Get the original template
    const original = await prisma.checklistTemplate.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!original) {
      return NextResponse.json(
        { error: 'Checklist template not found' },
        { status: 404 }
      )
    }

    // Parse sections (they're stored as JSON)
    const sections = Array.isArray(original.sections) ? original.sections : []

    // Create duplicate with new name
    const duplicate = await prisma.checklistTemplate.create({
      data: {
        companyId: user.companyId,
        name: name.trim(),
        nameEs: original.nameEs,
        description: original.description,
        sections: sections as any, // Deep clone the sections
        isActive: true,
      },
    })

    return NextResponse.json(duplicate, { status: 201 })
  } catch (error: any) {
    console.error('Error duplicating checklist template:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A checklist template with this name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to duplicate checklist template' },
      { status: 500 }
    )
  }
}


