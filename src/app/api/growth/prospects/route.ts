import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'

// GET /api/growth/prospects - List prospects
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const assignedToId = searchParams.get('assignedToId')
    const source = searchParams.get('source')

    const prospects = await prisma.prospect.findMany({
      where: {
        companyId: user.companyId,
        ...(status && { status }),
        ...(assignedToId && { assignedToId }),
        ...(source && { source }),
        ...(search && {
          OR: [
            { companyName: { contains: search, mode: 'insensitive' } },
            { legalName: { contains: search, mode: 'insensitive' } },
          ],
        }),
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
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            activities: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json(prospects)
  } catch (error) {
    console.error('Error fetching prospects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prospects' },
      { status: 500 }
    )
  }
}

// POST /api/growth/prospects - Create prospect
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
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
      priceLevel,
      status,
      priority,
      estimatedValue,
      source,
      sourceDetail,
      tags,
      notes,
      branchId,
      assignedToId,
      contacts,
      discoveryData,
    } = body

    const prospect = await prisma.prospect.create({
      data: {
        companyId: user.companyId,
        branchId: branchId || user.branchId,
        assignedToId,
        companyName,
        legalName,
        industry,
        businessType,
        address: address || null,
        website,
        phone,
        estimatedSize,
        employeeCount,
        annualRevenue: annualRevenue ? parseFloat(annualRevenue) : null,
        priceLevel,
        status: status || 'new',
        priority: priority || 'medium',
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
        source: source || 'manual',
        sourceDetail,
        tags: tags || [],
        notes,
        discoveryData: discoveryData || null,
        contacts: contacts
          ? {
              create: contacts.map((contact: any) => ({
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email,
                phone: contact.phone,
                title: contact.title,
                role: contact.role || 'primary',
                isDecisionMaker: contact.isDecisionMaker || false,
                notes: contact.notes,
              })),
            }
          : undefined,
      },
      include: {
        contacts: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json(prospect)
  } catch (error) {
    console.error('Error creating prospect:', error)
    return NextResponse.json(
      { error: 'Failed to create prospect' },
      { status: 500 }
    )
  }
}

