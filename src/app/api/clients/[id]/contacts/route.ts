import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/clients/[id]/contacts - List all contacts for a client
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

    const contacts = await prisma.clientContact.findMany({
      where: {
        clientId: id,
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json(contacts)
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}

// POST /api/clients/[id]/contacts - Create new contact
export async function POST(
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

    const {
      firstName,
      lastName,
      email,
      phone,
      role = 'primary',
      isPortalUser = false,
    } = body

    const contact = await prisma.clientContact.create({
      data: {
        clientId: id,
        firstName,
        lastName,
        email,
        phone,
        role,
        isPortalUser,
        ...(isPortalUser && { portalAccessGranted: new Date() }),
      },
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error: any) {
    console.error('Error creating contact:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A contact with this email already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}


