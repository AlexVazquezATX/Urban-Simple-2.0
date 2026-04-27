import { prisma } from '@/lib/db'

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

export async function getManagerNightlyReviewContext(params: {
  companyId: string
  managerId: string
  reviewId: string
}) {
  const parsed = parseNightlyReviewId(params.reviewId)
  if (!parsed) {
    return null
  }

  const shift = await prisma.shift.findFirst({
    where: {
      id: parsed.shiftId,
      managerId: params.managerId,
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
            where: {
              reviewerId: params.managerId,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
          issues: {
            where: {
              reportedById: params.managerId,
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
          },
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

  const serviceLog = shift.serviceLogs[0] ?? null
  const review = serviceLog?.reviews[0] ?? null

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
          displayName:
            shift.associate.displayName ||
            `${shift.associate.firstName || ''} ${shift.associate.lastName || ''}`.trim(),
        }
      : null,
    manager: shift.manager
      ? {
          id: shift.manager.id,
          displayName:
            shift.manager.displayName ||
            `${shift.manager.firstName || ''} ${shift.manager.lastName || ''}`.trim(),
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
    review: review
      ? {
          id: review.id,
          reviewDate: review.reviewDate,
          overallRating: Number(review.overallRating),
          ratingItems: review.ratingItems,
          notes: review.notes ?? '',
          photos: review.photos,
          issuesFound: review.issuesFound,
          createdAt: review.createdAt,
        }
      : null,
    issues: serviceLog?.issues ?? [],
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
