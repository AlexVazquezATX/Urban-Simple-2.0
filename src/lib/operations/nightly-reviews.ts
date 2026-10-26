import { prisma } from '@/lib/db'
import type { IncompleteItem } from '@/lib/ops/constants'

export type NightlyReviewItemStatus = 'good' | 'needs_work' | 'not_done' | 'pending'
export type NightlyReviewPainPointSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface NightlyReviewChecklistItemState {
  id: string
  label: string
  labelEs?: string
  sectionId?: string
  sectionName?: string
  sectionNameEs?: string
  status: NightlyReviewItemStatus
  notes: string
  photos: string[]
  requiresPhoto: boolean
  priority: string
  frequency: string
}

export interface NightlyReviewPainPoint {
  category: string
  severity: NightlyReviewPainPointSeverity
  description: string
  photos: string[]
}

const REVIEW_ID_PATTERN = /^shift-(.+)-location-(.+)$/

export function buildNightlyReviewId(shiftId: string, locationId: string) {
  return `shift-${shiftId}-location-${locationId}`
}

export function parseNightlyReviewId(reviewId: string) {
  const normalized = reviewId.trim()
  const match = normalized.match(REVIEW_ID_PATTERN)

  if (match) {
    return {
      shiftId: match[1],
      locationId: match[2],
    }
  }

  const legacyParts = normalized.split('-')
  if (legacyParts.length === 2 && legacyParts[0] && legacyParts[1]) {
    return {
      shiftId: legacyParts[0],
      locationId: legacyParts[1],
    }
  }

  return null
}

export function formatAddress(addressJson: unknown): string {
  if (!addressJson) return 'Address not available'

  if (typeof addressJson === 'string') {
    try {
      const parsed = JSON.parse(addressJson)
      return formatAddress(parsed)
    } catch {
      return addressJson
    }
  }

  if (!isRecord(addressJson)) return 'Address not available'

  const parts = [
    asString(addressJson.street) ?? asString(addressJson.address1),
    asString(addressJson.city),
    asString(addressJson.state),
    asString(addressJson.zip) ?? asString(addressJson.postalCode),
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : 'Address not available'
}

export function mergeChecklistReviewItems(
  sections: unknown,
  ratingItems: unknown
): NightlyReviewChecklistItemState[] {
  const templateItems = flattenChecklistSections(sections)
  const savedItems = Array.isArray(ratingItems)
    ? ratingItems
        .map((item) => normalizeSavedChecklistItem(item))
        .filter((item): item is NightlyReviewChecklistItemState => item !== null)
    : []

  if (templateItems.length === 0) {
    return savedItems
  }

  const savedById = new Map(savedItems.map((item) => [item.id, item]))
  const mergedItems = templateItems.map((item) => {
    const saved = savedById.get(item.id)
    if (!saved) {
      return item
    }

    return {
      ...item,
      ...saved,
      label: saved.label || item.label,
      labelEs: saved.labelEs || item.labelEs,
      sectionName: saved.sectionName || item.sectionName,
      sectionNameEs: saved.sectionNameEs || item.sectionNameEs,
      status: saved.status,
      notes: saved.notes,
      photos: saved.photos,
      requiresPhoto: saved.requiresPhoto || item.requiresPhoto,
      priority: saved.priority || item.priority,
      frequency: saved.frequency || item.frequency,
    }
  })

  const extraSavedItems = savedItems.filter(
    (saved) => !templateItems.some((template) => template.id === saved.id)
  )

  return [...mergedItems, ...extraSavedItems]
}

export function issuesToPainPoints(
  issues: Array<{
    category: string
    severity: string
    title: string
    description: string | null
    photos: string[]
  }>
): NightlyReviewPainPoint[] {
  return issues.map((issue) => ({
    category: issue.category || 'other',
    severity: normalizePainPointSeverity(issue.severity),
    description: issue.description?.trim() || issue.title,
    photos: issue.photos || [],
  }))
}

export interface NightlyReviewAssociateReport {
  serviceLogId: string
  shiftId: string | null
  associateId: string
  associateName: string
  serviceDate: string
  status: string
  clockIn: string | null
  clockOut: string | null
  submittedAt: string | null
  checklistDone: number
  checklistTotal: number
  incompleteItems: IncompleteItem[]
  overallNotes: string | null
  photos: string[]
  incompleteIssueId: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

/**
 * Associates log their work on their own shift, not on the manager's review
 * route. Match by location + service date instead. Shift dates are @db.Date at
 * UTC midnight; overnight work can land on the prior date, so we look at the
 * review date and the day before.
 */
export function associateLogsWhere(locationIds: string[], reviewDate: Date) {
  return {
    locationId: { in: locationIds },
    serviceDate: { in: [new Date(reviewDate.getTime() - DAY_MS), reviewDate] },
    shift: { is: { associateId: { not: null } } },
  }
}

/**
 * Pick the associate log a review should look at: one already reviewed on this
 * date wins, then the most recent log from the same date, then an unreviewed
 * log from the night before.
 */
export function pickAssociateLog<
  T extends {
    serviceDate: Date
    updatedAt: Date
    submittedAt: Date | null
    reviews: Array<{ reviewDate: Date }>
  },
>(logs: T[], reviewDate: Date): T | null {
  const day = dateKey(reviewDate)
  const priorDay = dateKey(new Date(reviewDate.getTime() - DAY_MS))
  const linked = logs.find((log) => log.reviews.some((r) => dateKey(r.reviewDate) === day))
  if (linked) return linked

  const recency = (log: T) => (log.submittedAt ?? log.updatedAt).getTime()
  const byRecent = (a: T, b: T) => recency(b) - recency(a)
  const sameDay = logs.filter((log) => dateKey(log.serviceDate) === day).sort(byRecent)
  if (sameDay[0]) return sameDay[0]

  const priorNight = logs
    .filter((log) => dateKey(log.serviceDate) === priorDay && log.reviews.length === 0)
    .sort(byRecent)
  return priorNight[0] ?? null
}

/** Done/total for an associate's checklistData (Record<itemId, boolean>). */
export function checklistProgress(sections: unknown, checklistData: unknown) {
  const data = isRecord(checklistData) ? checklistData : {}
  const templateIds = flattenChecklistSections(sections).map((item) => item.id)
  if (templateIds.length > 0) {
    return {
      done: templateIds.filter((id) => data[id] === true).length,
      total: templateIds.length,
    }
  }
  const values = Object.values(data)
  return { done: values.filter((v) => v === true).length, total: values.length }
}

export function parseIncompleteItems(value: unknown): IncompleteItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return []
    const itemId = asString(entry.itemId)
    if (!itemId) return []
    return [
      {
        itemId,
        text: asString(entry.text) ?? itemId,
        section: asString(entry.section),
        reason: asString(entry.reason) ?? 'other',
        note: asString(entry.note),
        photos: asStringArray(entry.photos),
      },
    ]
  })
}

function personName(person: {
  firstName: string | null
  lastName: string | null
  displayName: string | null
}) {
  return person.displayName || `${person.firstName || ''} ${person.lastName || ''}`.trim()
}

export async function getManagerNightlyReviewContext(params: {
  companyId: string
  managerId: string
  reviewId: string
  // ADMIN / SUPER_ADMIN can open any manager's review.
  allowAnyManager?: boolean
}) {
  const parsed = parseNightlyReviewId(params.reviewId)
  if (!parsed) {
    return null
  }

  const shift = await prisma.shift.findFirst({
    where: {
      id: parsed.shiftId,
      ...(params.allowAnyManager ? {} : { managerId: params.managerId }),
      branch: {
        companyId: params.companyId,
      },
    },
    include: {
      location: {
        select: {
          id: true,
          name: true,
          address: true,
          clientId: true,
          client: {
            select: {
              name: true,
            },
          },
          checklistTemplate: {
            select: {
              id: true,
              name: true,
              sections: true,
            },
          },
        },
      },
      shiftLocations: {
        where: {
          locationId: parsed.locationId,
        },
        orderBy: {
          sortOrder: 'asc',
        },
        include: {
          location: {
            select: {
              id: true,
              name: true,
              address: true,
              clientId: true,
              client: {
                select: {
                  name: true,
                },
              },
              checklistTemplate: {
                select: {
                  id: true,
                  name: true,
                  sections: true,
                },
              },
            },
          },
        },
      },
      associate: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
        },
      },
      manager: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
        },
      },
      serviceLogs: {
        where: {
          locationId: parsed.locationId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
        include: {
          reviews: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      },
      branch: {
        select: {
          timezone: true,
        },
      },
      _count: {
        select: {
          shiftLocations: true,
        },
      },
    },
  })

  if (!shift) {
    return null
  }

  const targetLocation =
    shift.shiftLocations[0]?.location ??
    (shift.location?.id === parsed.locationId ? shift.location : null)

  if (!targetLocation) {
    return null
  }

  const associateLogs = await prisma.serviceLog.findMany({
    where: associateLogsWhere([targetLocation.id], shift.date),
    orderBy: [{ serviceDate: 'desc' }, { updatedAt: 'desc' }],
    include: {
      associate: {
        select: { id: true, firstName: true, lastName: true, displayName: true },
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
      },
      issues: {
        where: { type: 'incomplete_work' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
  })
  const associateLog = pickAssociateLog(associateLogs, shift.date)

  const serviceLog = shift.serviceLogs[0] ?? null
  const shiftDay = dateKey(shift.date)
  const review =
    serviceLog?.reviews[0] ??
    associateLog?.reviews.find((r) => dateKey(r.reviewDate) === shiftDay) ??
    null

  // Pain points the reviewer filed with this review (read-only view).
  const issues =
    review?.serviceLogId
      ? await prisma.issue.findMany({
          where: {
            serviceLogId: review.serviceLogId,
            reportedById: review.reviewerId,
            type: 'issue',
          },
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            category: true,
            severity: true,
            title: true,
            description: true,
            photos: true,
            createdAt: true,
          },
        })
      : []

  const sections = targetLocation.checklistTemplate?.sections ?? []
  const associateReport: NightlyReviewAssociateReport | null = associateLog
    ? (() => {
        const progress = checklistProgress(sections, associateLog.checklistData)
        return {
          serviceLogId: associateLog.id,
          shiftId: associateLog.shiftId,
          associateId: associateLog.associateId,
          associateName: personName(associateLog.associate) || 'Associate',
          serviceDate: associateLog.serviceDate.toISOString(),
          status: associateLog.status,
          clockIn: associateLog.clockIn?.toISOString() ?? null,
          clockOut: associateLog.clockOut?.toISOString() ?? null,
          submittedAt: associateLog.submittedAt?.toISOString() ?? null,
          checklistDone: progress.done,
          checklistTotal: progress.total,
          incompleteItems: parseIncompleteItems(associateLog.incompleteItems),
          overallNotes: associateLog.overallNotes,
          photos: associateLog.photos,
          incompleteIssueId: associateLog.issues[0]?.id ?? null,
        }
      })()
    : null

  return {
    reviewId: params.reviewId,
    parsed,
    shift: {
      id: shift.id,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      status: shift.status,
      associateId: shift.associateId,
      managerId: shift.managerId,
      fallbackLocationId: shift.locationId,
      routeStopCount:
        shift._count.shiftLocations > 0 ? shift._count.shiftLocations : shift.locationId ? 1 : 0,
      timezone: shift.branch.timezone || 'America/Chicago',
    },
    location: {
      id: targetLocation.id,
      name: targetLocation.name,
      address: targetLocation.address,
      clientId: targetLocation.clientId,
      clientName: targetLocation.client?.name ?? '',
      checklistTemplate: targetLocation.checklistTemplate
        ? {
            id: targetLocation.checklistTemplate.id,
            name: targetLocation.checklistTemplate.name,
            sections: targetLocation.checklistTemplate.sections,
          }
        : null,
    },
    associate: shift.associate
      ? {
          id: shift.associate.id,
          displayName: personName(shift.associate),
        }
      : null,
    manager: shift.manager
      ? {
          id: shift.manager.id,
          displayName: personName(shift.manager),
        }
      : null,
    serviceLog: serviceLog
      ? {
          id: serviceLog.id,
          associateId: serviceLog.associateId,
          checklistTemplateId: serviceLog.checklistTemplateId,
          serviceDate: serviceLog.serviceDate,
          status: serviceLog.status,
          checklistData: serviceLog.checklistData,
          priorityItemsCompleted: serviceLog.priorityItemsCompleted,
          overallNotes: serviceLog.overallNotes,
          photos: serviceLog.photos,
        }
      : null,
    associateReport,
    review: review
      ? {
          id: review.id,
          serviceLogId: review.serviceLogId,
          reviewerId: review.reviewerId,
          reviewDate: review.reviewDate,
          overallRating: Number(review.overallRating),
          ratingItems: review.ratingItems,
          notes: review.notes ?? '',
          photos: review.photos,
          issuesFound: review.issuesFound,
          createdAt: review.createdAt,
        }
      : null,
    issues,
  }
}

function flattenChecklistSections(sections: unknown): NightlyReviewChecklistItemState[] {
  if (!Array.isArray(sections)) {
    return []
  }

  return sections.flatMap((section, sectionIndex) => {
    if (!isRecord(section)) {
      return []
    }

    const sectionId = asString(section.id) ?? `section-${sectionIndex + 1}`
    const sectionName = asString(section.name) ?? `Section ${sectionIndex + 1}`
    const sectionNameEs = asString(section.nameEs)
    const items = Array.isArray(section.items) ? section.items : []

    return items.flatMap((item, itemIndex) => {
      if (!isRecord(item)) {
        return []
      }

      const itemId = asString(item.id) ?? `${sectionId}-item-${itemIndex + 1}`
      const label = asString(item.text) ?? `Item ${itemIndex + 1}`

      return [
        {
          id: itemId,
          label,
          labelEs: asString(item.textEs),
          sectionId,
          sectionName,
          sectionNameEs,
          status: 'pending' as NightlyReviewItemStatus,
          notes: '',
          photos: [],
          requiresPhoto: Boolean(item.requiresPhoto),
          priority: asString(item.priority) ?? 'normal',
          frequency: asString(item.frequency) ?? 'daily',
        },
      ]
    })
  })
}

function normalizeSavedChecklistItem(value: unknown): NightlyReviewChecklistItemState | null {
  if (!isRecord(value)) {
    return null
  }

  const id = asString(value.id)
  if (!id) {
    return null
  }

  return {
    id,
    label:
      asString(value.label) ??
      asString(value.name) ??
      asString(value.text) ??
      `Checklist Item ${id}`,
    labelEs: asString(value.labelEs) ?? asString(value.textEs),
    sectionId: asString(value.sectionId),
    sectionName: asString(value.sectionName),
    sectionNameEs: asString(value.sectionNameEs),
    status: normalizeChecklistStatus(value.status),
    notes: asString(value.notes) ?? '',
    photos: asStringArray(value.photos),
    requiresPhoto: Boolean(value.requiresPhoto),
    priority: asString(value.priority) ?? 'normal',
    frequency: asString(value.frequency) ?? 'daily',
  }
}

function normalizeChecklistStatus(value: unknown): NightlyReviewItemStatus {
  const normalized = asString(value)?.toLowerCase().replace(/\s+/g, '_')

  switch (normalized) {
    case 'good':
      return 'good'
    case 'needs_work':
      return 'needs_work'
    case 'not_done':
      return 'not_done'
    default:
      return 'pending'
  }
}

function normalizePainPointSeverity(value: string): NightlyReviewPainPointSeverity {
  switch (value.toLowerCase()) {
    case 'critical':
      return 'critical'
    case 'high':
      return 'high'
    case 'low':
      return 'low'
    default:
      return 'medium'
  }
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((entry) => asString(entry))
        .filter((entry): entry is string => Boolean(entry))
    : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
