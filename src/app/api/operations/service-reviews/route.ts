import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  buildNightlyReviewId,
  getManagerNightlyReviewContext,
} from '@/lib/operations/nightly-reviews'

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

    const associateId =
      reviewContext.shift.associateId || reviewContext.shift.managerId || null

    if (!associateId) {
      return NextResponse.json(
        {
          error: 'This shift needs an assigned associate or manager before it can be reviewed',
        },
        { status: 400 }
      )
    }

    const reviewDate = new Date(reviewContext.shift.date)
    reviewDate.setHours(0, 0, 0, 0)

    const hasIncompleteWork = body.checklistItems.some(
      (item) => item.status === 'needs_work' || item.status === 'not_done'
    )
    const hasSeriousIssue = body.painPoints.some(
      (point) => point.severity === 'high' || point.severity === 'critical'
    )
    const nextServiceLogStatus = hasIncompleteWork || hasSeriousIssue ? 'partial' : 'completed'

    const result = await prisma.$transaction(async (tx) => {
      const serviceLog = reviewContext.serviceLog
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

      if (body.painPoints.length > 0) {
        await tx.issue.createMany({
          data: body.painPoints.map((point) => ({
            locationId: reviewContext.location.id,
            clientId: reviewContext.location.clientId,
            reportedById: user.id,
            serviceLogId: serviceLog.id,
            category: point.category.toLowerCase(),
            severity: point.severity,
            title:
              point.description.trim().slice(0, 100) ||
              `${point.category.replace(/_/g, ' ')} issue`,
            description: point.description.trim(),
            photos: point.photos || [],
            status: 'open',
            implicatedAssociateIds: reviewContext.shift.associateId
              ? [reviewContext.shift.associateId]
              : [],
          })),
        })
      }

      const reviewedLocations = await tx.serviceLog.findMany({
        where: {
          shiftId: reviewContext.shift.id,
        },
        select: {
          locationId: true,
          reviews: {
            select: {
              id: true,
            },
            take: 1,
          },
        },
      })

      const completedLocationIds = new Set(
        reviewedLocations
          .filter((log) => log.reviews.length > 0)
          .map((log) => log.locationId)
      )

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
      }
    })

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
