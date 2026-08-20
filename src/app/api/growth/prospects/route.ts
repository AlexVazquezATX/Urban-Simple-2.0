import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'

// Valid prospect statuses (mirrors the schema comment on Prospect.status).
const PROSPECT_STATUSES = [
  'prospect', 'new', 'researching', 'contacted', 'engaged', 'qualified',
  'proposal_sent', 'won', 'lost', 'nurturing',
]

// Valid priorities (mirrors the schema comment on Prospect.priority).
const PROSPECT_PRIORITIES = ['low', 'medium', 'high', 'urgent']

// Sortable columns. NOTE: priority/status are plain strings in the DB, so
// sorting them is alphabetical (urgent > medium > low > high for desc) — the
// same caveat the default sort has always had.
const SORTABLE_FIELDS = [
  'createdAt', 'updatedAt', 'companyName', 'priority', 'status',
  'estimatedValue', 'lastContactedAt',
] as const
type SortField = (typeof SORTABLE_FIELDS)[number]

/**
 * GET /api/growth/prospects - List prospects
 *
 * Filters: status, priority (both case-insensitive; 400 on unknown values),
 * search, assignedToId, source.
 *
 * Sorting: sortBy (createdAt | updatedAt | companyName | priority | status |
 * estimatedValue | lastContactedAt) + sortOrder (asc | desc, default desc).
 * Default without sortBy stays priority-then-createdAt. For "newest leads":
 * ?status=new&sortBy=createdAt&sortOrder=desc&limit=25
 *
 * Two response shapes:
 * - No pagination params → legacy bare array with full includes (what the
 *   web UI's bulk-sender / prospect-selector consume). Unchanged.
 * - Any of limit / page / offset → `{ data, pagination }` envelope with a
 *   LEAN projection: `discoveryData` and `activities` are omitted (they blow
 *   list responses past response-size limits) — fetch those from the detail
 *   route /api/growth/prospects/[id].
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rawStatus = searchParams.get('status')
    const status = rawStatus ? rawStatus.trim().toLowerCase() : null
    if (status && !PROSPECT_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status "${rawStatus}"`, validStatuses: PROSPECT_STATUSES },
        { status: 400 },
      )
    }
    const rawPriority = searchParams.get('priority')
    const priority = rawPriority ? rawPriority.trim().toLowerCase() : null
    if (priority && !PROSPECT_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority "${rawPriority}"`, validPriorities: PROSPECT_PRIORITIES },
        { status: 400 },
      )
    }
    const search = searchParams.get('search')
    const assignedToId = searchParams.get('assignedToId')
    const source = searchParams.get('source')

    const rawSortBy = searchParams.get('sortBy')
    if (rawSortBy && !(SORTABLE_FIELDS as readonly string[]).includes(rawSortBy)) {
      return NextResponse.json(
        { error: `Invalid sortBy "${rawSortBy}"`, validSortFields: SORTABLE_FIELDS },
        { status: 400 },
      )
    }
    const rawSortOrder = searchParams.get('sortOrder')?.toLowerCase()
    if (rawSortOrder && rawSortOrder !== 'asc' && rawSortOrder !== 'desc') {
      return NextResponse.json(
        { error: `Invalid sortOrder "${searchParams.get('sortOrder')}"`, validSortOrders: ['asc', 'desc'] },
        { status: 400 },
      )
    }
    const sortBy = rawSortBy as SortField | null
    const sortOrder: 'asc' | 'desc' = rawSortOrder === 'asc' ? 'asc' : 'desc'

    const where = {
      companyId: user.companyId,
      deletedAt: null,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(assignedToId && { assignedToId }),
      ...(source && { source }),
      ...(search && {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' as const } },
          { legalName: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }
    // Explicit sortBy wins (createdAt tiebreak for stable paging); otherwise
    // the long-standing default of priority-then-newest.
    const orderBy = sortBy
      ? [{ [sortBy]: sortOrder }, ...(sortBy !== 'createdAt' ? [{ createdAt: 'desc' as const }] : [])]
      : [{ priority: 'desc' as const }, { createdAt: 'desc' as const }]

    const wantsPagination =
      searchParams.has('limit') || searchParams.has('page') || searchParams.has('offset')

    if (wantsPagination) {
      const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '25', 10) || 25, 1), 100)
      const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1)
      const offset = searchParams.has('offset')
        ? Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0)
        : (page - 1) * limit

      const [total, data] = await Promise.all([
        prisma.prospect.count({ where }),
        prisma.prospect.findMany({
          where,
          // Lean list projection: everything except the heavy blobs.
          omit: { discoveryData: true },
          include: {
            contacts: true,
            assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
            _count: { select: { activities: true } },
          },
          orderBy,
          skip: offset,
          take: limit,
        }),
      ])

      return NextResponse.json({
        data,
        pagination: {
          total,
          limit,
          offset,
          page: Math.floor(offset / limit) + 1,
          totalPages: Math.max(Math.ceil(total / limit), 1),
          hasMore: offset + data.length < total,
        },
      })
    }

    // Legacy shape: bare array, full includes.
    const prospects = await prisma.prospect.findMany({
      where,
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
      orderBy,
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
              create: contacts.map((contact: Record<string, unknown> & { firstName?: string; lastName?: string; email?: string; phone?: string; title?: string; role?: string; isPrimary?: boolean; isDecisionMaker?: boolean; notes?: string }) => ({
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

