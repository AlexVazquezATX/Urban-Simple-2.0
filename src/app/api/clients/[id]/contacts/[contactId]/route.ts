import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { resolveContactAlertFields } from '@/lib/ops/contact-alerts'

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']

// PATCH /api/clients/[id]/contacts/[contactId] - Update contact
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!MANAGER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, contactId } = await params
    const body = await request.json()

    // Verify client belongs to user's company
    const client = await prisma.client.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Verify contact belongs to client
    const existingContact = await prisma.clientContact.findFirst({
      where: {
        id: contactId,
        clientId: id,
      },
    })

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const {
      firstName,
      lastName,
      email,
      role,
      isPortalUser,
    } = body

    // Alert routing (locations, email/SMS opt-in + consent, phone normalization).
    const alerts = await resolveContactAlertFields({ clientId: id, body, existing: existingContact })
    if ('error' in alerts) {
      return NextResponse.json({ error: alerts.error }, { status: 400 })
    }

    const updateData: any = { ...alerts.data }
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (email !== undefined) updateData.email = email
    if (role !== undefined) updateData.role = role
    if (isPortalUser !== undefined) {
      updateData.isPortalUser = isPortalUser
      // Set portal access granted date if enabling portal access
      if (isPortalUser && !existingContact.portalAccessGranted) {
        updateData.portalAccessGranted = new Date()
      }
    }

    const contact = await prisma.clientContact.update({
      where: { id: contactId },
      data: updateData,
    })

    return NextResponse.json(contact)
  } catch (error: any) {
    console.error('Error updating contact:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A contact with this email already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id]/contacts/[contactId] - Delete contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!MANAGER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, contactId } = await params

    // Verify client belongs to user's company
    const client = await prisma.client.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Verify contact belongs to client
    const existingContact = await prisma.clientContact.findFirst({
      where: {
        id: contactId,
        clientId: id,
      },
    })

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    await prisma.clientContact.delete({
      where: { id: contactId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    )
  }
}


