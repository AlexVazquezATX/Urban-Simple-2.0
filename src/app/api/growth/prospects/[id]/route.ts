import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/growth/prospects/[id] - Get prospect details
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

    const prospect = await prisma.prospect.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        contacts: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        activities: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        campaigns: {
          include: {
            messages: {
              orderBy: {
                step: 'asc',
              },
            },
          },
        },
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    return NextResponse.json(prospect)
  } catch (error) {
    console.error('Error fetching prospect:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prospect' },
      { status: 500 }
    )
  }
}

// PATCH /api/growth/prospects/[id] - Update prospect
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

    // Verify prospect belongs to user's company
    const existing = await prisma.prospect.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    const {
      companyName,
      legalName,
      industry,
      businessType,
      address,
      website,
      phone,
      estimatedSize,
      employeeCount,
      annualRevenue,
      status,
      priority,
      estimatedValue,
      source,
      sourceDetail,
      tags,
      notes,
      branchId,
      assignedToId,
      lostReason,
      convertedToClientId,
      discoveryData,
      contact,
      contacts,
    } = body

    const prospect = await prisma.prospect.update({
      where: { id },
      data: {
        ...(companyName !== undefined && { companyName }),
        ...(legalName !== undefined && { legalName }),
        ...(industry !== undefined && { industry }),
        ...(businessType !== undefined && { businessType }),
        ...(address !== undefined && { address }),
        ...(website !== undefined && { website }),
        ...(phone !== undefined && { phone }),
        ...(estimatedSize !== undefined && { estimatedSize }),
        ...(employeeCount !== undefined && { employeeCount }),
        ...(annualRevenue !== undefined && { annualRevenue: annualRevenue ? parseFloat(annualRevenue) : null }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(estimatedValue !== undefined && { estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null }),
        ...(source !== undefined && { source }),
        ...(sourceDetail !== undefined && { sourceDetail }),
        ...(tags !== undefined && { tags }),
        ...(notes !== undefined && { notes }),
        ...(branchId !== undefined && { branchId }),
        ...(assignedToId !== undefined && { assignedToId }),
        ...(lostReason !== undefined && { lostReason }),
        ...(convertedToClientId !== undefined && { convertedToClientId }),
        ...(status === 'won' && convertedToClientId && { convertedToClientId }),
        ...(discoveryData !== undefined && { discoveryData }),
      },
    })

    // Handle multiple contacts (new format)
    if (contacts && Array.isArray(contacts)) {
      // Get existing contacts for this prospect
      const existingContacts = await prisma.prospectContact.findMany({
        where: { prospectId: id },
        select: { id: true },
      })
      const existingIds = new Set(existingContacts.map(c => c.id))

      // Track which contacts are in the update
      const updatedIds = new Set<string>()

      for (const c of contacts) {
        if (c.id && existingIds.has(c.id)) {
          // Update existing contact
          updatedIds.add(c.id)
          await prisma.prospectContact.update({
            where: { id: c.id },
            data: {
              firstName: c.firstName || '',
              lastName: c.lastName || '',
              email: c.email,
              phone: c.phone,
              title: c.title,
            },
          })
        } else if (c.firstName || c.lastName || c.email || c.title) {
          // Create new contact
          await prisma.prospectContact.create({
            data: {
              prospectId: id,
              firstName: c.firstName || '',
              lastName: c.lastName || '',
              email: c.email,
              phone: c.phone,
              title: c.title,
            },
          })
        }
      }

      // Delete contacts that were removed (not in the update)
      const toDelete = [...existingIds].filter(id => !updatedIds.has(id))
      if (toDelete.length > 0) {
        await prisma.prospectContact.deleteMany({
          where: {
            id: { in: toDelete },
            prospectId: id,
          },
        })
      }
    }
    // Handle single contact update (legacy format)
    else if (contact) {
      if (contact.id) {
        // Update existing contact
        await prisma.prospectContact.update({
          where: { id: contact.id },
          data: {
            firstName: contact.firstName || '',
            lastName: contact.lastName || '',
            email: contact.email,
            phone: contact.phone,
            title: contact.title,
          },
        })
      } else if (contact.firstName || contact.lastName || contact.email) {
        // Create new contact
        await prisma.prospectContact.create({
          data: {
            prospectId: id,
            firstName: contact.firstName || '',
            lastName: contact.lastName || '',
            email: contact.email,
            phone: contact.phone,
            title: contact.title,
          },
        })
      }
    }

    // Log activity if status changed
    if (status && status !== existing.status) {
      await prisma.prospectActivity.create({
        data: {
          prospectId: id,
          userId: user.id,
          type: 'status_change',
          title: `Status changed to ${status}`,
          description: `Status updated from ${existing.status} to ${status}`,
        },
      })
    }

    // Refetch with all relations
    const updatedProspect = await prisma.prospect.findFirst({
      where: { id },
      include: {
        contacts: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        activities: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(updatedProspect)
  } catch (error) {
    console.error('Error updating prospect:', error)
    return NextResponse.json(
      { error: 'Failed to update prospect' },
      { status: 500 }
    )
  }
}

// DELETE /api/growth/prospects/[id] - Delete prospect
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

    // Verify prospect belongs to user's company
    const existing = await prisma.prospect.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    await prisma.prospect.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting prospect:', error)
    return NextResponse.json(
      { error: 'Failed to delete prospect' },
      { status: 500 }
    )
  }
}

