import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

const CATEGORIES = ['outreach', 'billing', 'portal', 'transactional', 'reply', 'other']
const TRIAGE_STATES = ['needs_reply', 'done', 'snoozed']

/**
 * GET /api/communications — the Comms Hub feed.
 * All correspondence (in + out) across outreach, billing, portal, transactional.
 *
 * Filters: view=attention|all (attention = inbound needing a human),
 * direction, category, state, prospectId, clientId, invoiceId,
 * contact=<email> (matches either side), q=<search subject/body>.
 * Pagination: limit (default 25, max 100), page or offset.
 * Returns { data, pagination, counts: { attention } } — rows carry resolved
 * prospectName / clientName.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sp = request.nextUrl.searchParams
    const view = sp.get('view') || 'all'
    const category = sp.get('category')
    if (category && !CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Invalid category "${category}"`, validCategories: CATEGORIES }, { status: 400 })
    }
    const direction = sp.get('direction')
    if (direction && !['inbound', 'outbound'].includes(direction)) {
      return NextResponse.json({ error: `Invalid direction "${direction}"`, validDirections: ['inbound', 'outbound'] }, { status: 400 })
    }
    const state = sp.get('state')
    if (state && !TRIAGE_STATES.includes(state)) {
      return NextResponse.json({ error: `Invalid state "${state}"`, validStates: TRIAGE_STATES }, { status: 400 })
    }
    const contact = sp.get('contact')?.trim().toLowerCase() || null
    const q = sp.get('q')?.trim() || null

    const now = new Date()
    const attentionWhere = {
      companyId: user.companyId,
      direction: 'inbound',
      triageState: 'needs_reply',
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
    }

    const where = view === 'attention'
      ? attentionWhere
      : {
          companyId: user.companyId,
          ...(direction && { direction }),
          ...(category && { category }),
          ...(state && { triageState: state }),
          ...(sp.get('prospectId') && { prospectId: sp.get('prospectId')! }),
          ...(sp.get('clientId') && { clientId: sp.get('clientId')! }),
          ...(sp.get('invoiceId') && { invoiceId: sp.get('invoiceId')! }),
          ...(contact && { OR: [{ toEmail: contact }, { fromEmail: contact }] }),
          ...(q && {
            OR: [
              { subject: { contains: q, mode: 'insensitive' as const } },
              { body: { contains: q, mode: 'insensitive' as const } },
              { toEmail: { contains: q.toLowerCase() } },
              { fromEmail: { contains: q.toLowerCase() } },
            ],
          }),
        }

    const limit = Math.min(Math.max(parseInt(sp.get('limit') ?? '25', 10) || 25, 1), 100)
    const page = Math.max(parseInt(sp.get('page') ?? '1', 10) || 1, 1)
    const offset = sp.has('offset') ? Math.max(parseInt(sp.get('offset') ?? '0', 10) || 0, 0) : (page - 1) * limit

    const [total, rows, attentionCount] = await Promise.all([
      prisma.commMessage.count({ where }),
      prisma.commMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.commMessage.count({ where: attentionWhere }),
    ])

    // Resolve entity names in one pass each.
    const prospectIds = [...new Set(rows.map((r) => r.prospectId).filter((x): x is string => !!x))]
    const clientIds = [...new Set(rows.map((r) => r.clientId).filter((x): x is string => !!x))]
    const [prospects, clients] = await Promise.all([
      prospectIds.length
        ? prisma.prospect.findMany({ where: { id: { in: prospectIds } }, select: { id: true, companyName: true } })
        : Promise.resolve([]),
      clientIds.length
        ? prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
    ])
    const prospectName = new Map(prospects.map((p) => [p.id, p.companyName]))
    const clientName = new Map(clients.map((c) => [c.id, c.name]))

    return NextResponse.json({
      data: rows.map((r) => ({
        ...r,
        body: r.body ? r.body.slice(0, 500) : null, // list projection; full body on detail
        prospectName: r.prospectId ? prospectName.get(r.prospectId) ?? null : null,
        clientName: r.clientId ? clientName.get(r.clientId) ?? null : null,
      })),
      pagination: {
        total,
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        hasMore: offset + rows.length < total,
      },
      counts: { attention: attentionCount },
    })
  } catch (error) {
    console.error('Error fetching communications:', error)
    return NextResponse.json({ error: 'Failed to fetch communications' }, { status: 500 })
  }
}
