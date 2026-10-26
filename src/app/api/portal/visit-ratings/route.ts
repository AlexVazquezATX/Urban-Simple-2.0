import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/db'
import { getPortalContext } from '@/lib/portal-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { addDaysToKey, clientTimezone, localDateKey } from '@/lib/portal-dates'
import { onVisitRated } from '@/lib/ops/issue-events'

const RATING_WINDOW_DAYS = 30

// POST /api/portal/visit-ratings — "How was this visit?" from the cleaning log.
// One rating per user, location and service date (re-rating updates it).
//
// Body: { locationId, serviceDate: 'yyyy-MM-dd', rating: 1-5, comment?, shiftId? }
export async function POST(request: NextRequest) {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ctx.impersonating) {
    return NextResponse.json({ error: 'Ratings are turned off while viewing as a client.' }, { status: 403 })
  }
  if (ctx.client.isSelfServe) {
    return NextResponse.json({ error: 'Visit ratings are for Urban Simple cleaning clients.' }, { status: 400 })
  }

  const limit = checkRateLimit(`portal-rating:${ctx.userId}`, { limit: 30, windowSeconds: 10 * 60 })
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many ratings in a short time. Please try again in a bit.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const locationId = typeof body.locationId === 'string' ? body.locationId : ''
  const serviceDateKey = typeof body.serviceDate === 'string' ? body.serviceDate : ''
  const rating = Number(body.rating)
  const comment = typeof body.comment === 'string' ? body.comment.trim() : ''
  const shiftIdRaw = typeof body.shiftId === 'string' ? body.shiftId : null

  if (!ctx.locations.some(l => l.id === locationId)) {
    return NextResponse.json({ error: 'Invalid location' }, { status: 400 })
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1 to 5 stars' }, { status: 400 })
  }
  if (comment.length > 2000) {
    return NextResponse.json({ error: 'Please keep comments under 2000 characters' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDateKey)) {
    return NextResponse.json({ error: 'Invalid service date' }, { status: 400 })
  }

  const today = localDateKey(new Date(), await clientTimezone(ctx.client.id))
  if (serviceDateKey > today) {
    return NextResponse.json({ error: "You can't rate a visit that hasn't happened yet" }, { status: 400 })
  }
  if (serviceDateKey < addDaysToKey(today, -RATING_WINDOW_DAYS)) {
    return NextResponse.json(
      { error: `Visits can be rated for ${RATING_WINDOW_DAYS} days` },
      { status: 400 }
    )
  }
  const serviceDate = new Date(`${serviceDateKey}T00:00:00Z`)

  // There has to have been a visit at this location that day.
  const [shift, serviceLog, review] = await Promise.all([
    prisma.shift.findFirst({
      where: {
        ...(shiftIdRaw ? { id: shiftIdRaw } : {}),
        date: serviceDate,
        status: { in: ['completed', 'in_progress'] },
        OR: [{ locationId }, { shiftLocations: { some: { locationId } } }],
      },
      select: { id: true },
    }),
    prisma.serviceLog.findFirst({
      where: { locationId, serviceDate },
      orderBy: { createdAt: 'desc' },
      select: { id: true, shiftId: true },
    }),
    prisma.serviceReview.findFirst({
      where: { locationId, reviewDate: serviceDate },
      select: { id: true },
    }),
  ])
  if (!shift && !serviceLog && !review) {
    return NextResponse.json({ error: 'We could not find a visit on that date' }, { status: 400 })
  }

  const shiftId = shift?.id ?? serviceLog?.shiftId ?? null
  const saved = await prisma.clientVisitRating.upsert({
    where: {
      createdById_locationId_serviceDate: {
        createdById: ctx.userId,
        locationId,
        serviceDate,
      },
    },
    create: {
      clientId: ctx.client.id,
      locationId,
      serviceDate,
      shiftId,
      serviceLogId: serviceLog?.id ?? null,
      rating,
      comment: comment || null,
      createdById: ctx.userId,
    },
    update: {
      rating,
      comment: comment || null,
      shiftId,
      serviceLogId: serviceLog?.id ?? null,
    },
    select: { id: true, rating: true, comment: true },
  })

  after(() => onVisitRated(saved.id))

  return NextResponse.json(saved)
}
