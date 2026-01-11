import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const sequence = await prisma.outreachCampaign.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        messages: {
          orderBy: {
            step: 'asc',
          },
        },
      },
    })

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    return NextResponse.json(sequence)
  } catch (error) {
    console.error('Error fetching sequence:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sequence' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const sequence = await prisma.outreachCampaign.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    const updated = await prisma.outreachCampaign.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating sequence:', error)
    return NextResponse.json(
      { error: 'Failed to update sequence' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const sequence = await prisma.outreachCampaign.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    await prisma.outreachCampaign.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sequence:', error)
    return NextResponse.json(
      { error: 'Failed to delete sequence' },
      { status: 500 }
    )
  }
}
