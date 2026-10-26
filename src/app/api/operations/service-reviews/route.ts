import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  buildNightlyReviewId,
  getManagerNightlyReviewContext,
} from '@/lib/operations/nightly-reviews'
import { toIssueCategory } from '@/lib/operations/review-categories'
import { onIssueCreated } from '@/lib/ops/issue-events'

const checklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  labelEs: z.string().optional(),
  sectionId: z.string().optional(),
  sectionName: z.string().optional(),
  sectionNameEs: z.string().optional(),
  status: z.enum(['good', 'needs_work', 'not_done', 'pending']),
  notes: z.string().optional().default(''),
  photos: z.array(z.string()).optional().default([]),
  requiresPhoto: z.boolean().optional().default(false),
  priority: z.string().optional().default('normal'),
  frequency: z.string().optional().default('daily'),
})

const painPointSchema = z.object({
  category: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string().min(1),
  photos: z.array(z.string()).optional().default([]),
})

const serviceReviewSchema = z
  .object({
    reviewId: z.string().optional(),
    shiftId: z.string().optional(),
    locationId: z.string().optional(),
    overallRating: z.number().min(1).max(5),
    checklistItems: z.array(checklistItemSchema).default([]),
    painPoints: z.array(painPointSchema).default([]),
    notes: z.string().nullable().optional(),
    photos: z.array(z.string()).default([]),
  })
  .superRefine((value, ctx) => {
    if (!value.reviewId && (!value.shiftId || !value.locationId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide reviewId or both shiftId and locationId',
      })
    }
  })

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['MANAGER', 'SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const rawBody = await request.json()
    const parsedBody = serviceReviewSchema.safeParse(rawBody)

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: 'Invalid review submission',
          issues: parsedBody.error.flatten(),
        },
        { status: 400 }
      )
    }

    const body = parsedBody.data
    const reviewId =
      body.reviewId || buildNightlyReviewId(body.shiftId as string, body.locationId as string)

    const reviewContext = await getManagerNightlyReviewContext({
      companyId: user.companyId,
      managerId: user.id,
      reviewId,
      allowAnyManager: user.role === 'ADMIN' || user.role === 'SUPER_ADMIN',
    })

    if (!reviewContext) {
      return NextResponse.json({ error: 'Shift stop not found' }, { status: 404 })
    }

    if (reviewContext.review) {
      return NextResponse.json(
        { error: 'This review has already been submitted' },
        { status: 409 }
      )
    }

    // When the associate logged this stop on their own shift, the review
    // attaches to that log so it is credited to the person who did the work.
    const associateLog =
      reviewContext.associateReport &&
      reviewContext.associateReport.serviceLogId !== reviewContext.serviceLog?.id
        ? reviewContext.associateReport
        : null

    const associateId =
      associateLog?.associateId ||
      reviewContext.shift.associateId ||
      reviewContext.shift.managerId ||
      null

    if (!associateId) {
      return NextResponse.json(
        {
          error: 'This shift needs an assigned associate or manager before it can be reviewed',
        },
        { status: 400 }
      )
    }

    // Shift dates are already UTC midnight of the service day.
    const reviewDate = new Date(reviewContext.shift.date)

    const hasIncompleteWork = body.checklistItems.some(
      (item) => item.status === 'needs_work' || item.status === 'not_done'
    )
    const hasSeriousIssue = body.painPoints.some(
      (point) => point.severity === 'high' || point.severity === 'critical'
    )
    const nextServiceLogStatus = hasIncompleteWork || hasSeriousIssue ? 'partial' : 'completed'

    const implicatedAssociateIds = associateLog
      ? [associateLog.associateId]
      : reviewContext.shift.associateId
        ? [reviewContext.shift.associateId]
        : []

    const result = await prisma.$transaction(async (tx) => {
      const serviceLog = associateLog
        ? { id: associateLog.serviceLogId }
        : reviewContext.serviceLog
        ? await tx.serviceLog.update({
            where: {
              id: reviewContext.serviceLog.id,
            },
            data: {
              status: nextServiceLogStatus,
              checklistTemplateId:
                reviewContext.location.checklistTemplate?.id ||
                reviewContext.serviceLog.checklistTemplateId ||
                null,
              photos:
                body.photos.length > 0
                  ? Array.from(new Set([...(reviewContext.serviceLog.photos || []), ...body.photos]))
                  : reviewContext.serviceLog.photos,
            },
          })
        : await tx.serviceLog.create({
            data: {
              shiftId: reviewContext.shift.id,
              locationId: reviewContext.location.id,
              associateId,
              checklistTemplateId: reviewContext.location.checklistTemplate?.id || null,
              serviceDate: reviewDate,
              status: nextServiceLogStatus,
              photos: body.photos,
            },
          })

      const serviceReview = await tx.serviceReview.create({
        data: {
          serviceLogId: serviceLog.id,
          locationId: reviewContext.location.id,
          associateId,
          reviewerId: user.id,
          reviewDate,
          overallRating: body.overallRating,
          ratingItems: body.checklistItems.map((item) => ({
            id: item.id,
            label: item.label || item.id,
            labelEs: item.labelEs,
            sectionId: item.sectionId,
            sectionName: item.sectionName,
            sectionNameEs: item.sectionNameEs,
            status: item.status,
            notes: item.notes || '',
            photos: item.photos || [],
            requiresPhoto: item.requiresPhoto,
            priority: item.priority,
            frequency: item.frequency,
          })),
          notes: body.notes?.trim() || null,
          photos: body.photos,
          issuesFound: body.painPoints.length > 0,
        },
      })

      // Review findings are internal QA: hidden from the client portal until a
      // manager chooses to share them.
      const issueIds: string[] = []
      for (const point of body.painPoints) {
        const issue = await tx.issue.create({
          data: {
            locationId: reviewContext.location.id,
            clientId: reviewContext.location.clientId,
            reportedById: user.id,
            serviceLogId: serviceLog.id,
            type: 'issue',
            source: 'manager_review',
            visibleToClient: false,
            category: toIssueCategory(point.category),
            severity: point.severity,
            title:
              point.description.trim().slice(0, 100) ||
              `${point.category.replace(/_/g, ' ')} issue`,
            description: point.description.trim(),
            photos: point.photos || [],
            status: 'open',
            implicatedAssociateIds,
          },
          select: { id: true },
        })
        issueIds.push(issue.id)
      }

      // A stop counts as reviewed once any review exists for that location on
      // this service date, whether it hangs off the route's own log or the
      // associate's.
      const routeStops = await tx.shiftLocation.findMany({
        where: {
          shiftId: reviewContext.shift.id,
        },
        select: {
          locationId: true,
        },
      })
      const routeLocationIds =
        routeStops.length > 0
          ? routeStops.map((stop) => stop.locationId)
          : [reviewContext.shift.fallbackLocationId ?? reviewContext.location.id]

      const reviewedLocations = await tx.serviceReview.findMany({
        where: {
          reviewDate,
          locationId: { in: routeLocationIds },
        },
        select: {
          locationId: true,
        },
        distinct: ['locationId'],
      })

      const completedLocationIds = new Set(reviewedLocations.map((r) => r.locationId))

      const totalRouteStops = Math.max(reviewContext.shift.routeStopCount, 1)
      const nextShiftStatus =
        completedLocationIds.size >= totalRouteStops ? 'completed' : 'in_progress'

      await tx.shift.update({
        where: {
          id: reviewContext.shift.id,
        },
        data: {
          status: nextShiftStatus,
        },
      })

      return {
        serviceLogId: serviceLog.id,
        serviceReviewId: serviceReview.id,
        shiftStatus: nextShiftStatus,
        issueIds,
      }
    })

    for (const issueId of result.issueIds) {
      after(() => onIssueCreated(issueId))
    }

    return NextResponse.json({
      success: true,
      reviewId: result.serviceReviewId,
      serviceLogId: result.serviceLogId,
      shiftStatus: result.shiftStatus,
    })
  } catch (error) {
    console.error('Service review submission error:', error)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}
