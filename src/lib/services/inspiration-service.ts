/**
 * Daily Inspiration Service
 * Database operations for trending topics and briefings
 */

import { prisma } from '@/lib/db'
import type { InspirationCategory, InspirationStatus } from '@prisma/client'

// ============================================
// TYPES
// ============================================

export interface CreateTopicInput {
  companyId: string
  title: string
  summary: string
  context?: string
  category: InspirationCategory
  subcategory?: string
  sourceType?: string
  sourceUrl?: string
  sourceName?: string
  postIdeas?: object[]
  suggestedHooks?: string[]
  relatedHashtags?: string[]
  relevanceScore?: number
  trendingScore?: number
  expiresAt?: Date
  imageUrl?: string
  imagePrompt?: string
  forDate: Date
  briefingId?: string
}

export interface CreateBriefingInput {
  companyId: string
  forDate: Date
  headline?: string
  greeting?: string
  summary?: string
}

// ============================================
// BRIEFINGS
// ============================================

export async function createBriefing(input: CreateBriefingInput) {
  return prisma.inspirationBriefing.create({
    data: {
      ...input,
      status: 'generating',
    },
  })
}

export async function getBriefingByDate(companyId: string, forDate: Date) {
  // Normalize to start of day
  const dateOnly = new Date(forDate)
  dateOnly.setHours(0, 0, 0, 0)

  return prisma.inspirationBriefing.findUnique({
    where: {
      companyId_forDate: {
        companyId,
        forDate: dateOnly,
      },
    },
    include: {
      topics: {
        orderBy: [
          { relevanceScore: 'desc' },
          { trendingScore: 'desc' },
        ],
      },
    },
  })
}

export async function getOrCreateBriefing(companyId: string, forDate: Date) {
  const dateOnly = new Date(forDate)
  dateOnly.setHours(0, 0, 0, 0)

  const existing = await getBriefingByDate(companyId, dateOnly)
  if (existing) return existing

  return createBriefing({
    companyId,
    forDate: dateOnly,
  })
}

export async function updateBriefing(
  id: string,
  data: Partial<{
    status: string
    headline: string
    greeting: string
    summary: string
    aiModel: string
    generatedAt: Date
    generationTime: number
    errorMessage: string
    totalDiscovered: number
    totalApproved: number
  }>
) {
  return prisma.inspirationBriefing.update({
    where: { id },
    data,
  })
}

export async function getBriefingHistory(companyId: string, limit: number = 7) {
  return prisma.inspirationBriefing.findMany({
    where: { companyId },
    orderBy: { forDate: 'desc' },
    take: limit,
    include: {
      topics: {
        select: {
          id: true,
          status: true,
          category: true,
        },
      },
    },
  })
}

// ============================================
// TOPICS
// ============================================

export async function createTopic(input: CreateTopicInput) {
  return prisma.inspirationTopic.create({
    data: {
      ...input,
      postIdeas: input.postIdeas || [],
    },
  })
}

export async function createManyTopics(inputs: CreateTopicInput[]) {
  return prisma.inspirationTopic.createMany({
    data: inputs.map((input) => ({
      ...input,
      postIdeas: input.postIdeas || [],
    })),
  })
}

export async function getTopicById(id: string) {
  return prisma.inspirationTopic.findUnique({
    where: { id },
  })
}

export async function getTopicsForDate(
  companyId: string,
  forDate: Date,
  filters?: {
    status?: InspirationStatus
    category?: InspirationCategory
  }
) {
  const dateOnly = new Date(forDate)
  dateOnly.setHours(0, 0, 0, 0)

  return prisma.inspirationTopic.findMany({
    where: {
      companyId,
      forDate: dateOnly,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.category ? { category: filters.category } : {}),
    },
    orderBy: [
      { status: 'asc' }, // PENDING first
      { relevanceScore: 'desc' },
      { trendingScore: 'desc' },
    ],
  })
}

export async function getApprovedTopicsForDate(companyId: string, forDate: Date) {
  return getTopicsForDate(companyId, forDate, { status: 'APPROVED' })
}

export async function getPendingTopicsForDate(companyId: string, forDate: Date) {
  return getTopicsForDate(companyId, forDate, { status: 'PENDING' })
}

export async function approveTopic(id: string, approvedById: string) {
  return prisma.inspirationTopic.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedById,
    },
  })
}

export async function rejectTopic(id: string, reason?: string) {
  return prisma.inspirationTopic.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectedReason: reason,
    },
  })
}

export async function markTopicAsUsed(id: string, contentId: string) {
  return prisma.inspirationTopic.update({
    where: { id },
    data: {
      status: 'USED',
      usedAt: new Date(),
      usedInContentId: contentId,
    },
  })
}

export async function updateTopic(
  id: string,
  data: Partial<{
    title: string
    summary: string
    context: string
    postIdeas: object[]
    suggestedHooks: string[]
    relatedHashtags: string[]
    imageUrl: string
    status: InspirationStatus
  }>
) {
  return prisma.inspirationTopic.update({
    where: { id },
    data,
  })
}

export async function deleteTopic(id: string) {
  return prisma.inspirationTopic.delete({
    where: { id },
  })
}

// ============================================
// STATS
// ============================================

export async function getInspirationStats(companyId: string, forDate: Date) {
  const dateOnly = new Date(forDate)
  dateOnly.setHours(0, 0, 0, 0)

  const [total, byStatus, byCategory] = await Promise.all([
    prisma.inspirationTopic.count({
      where: { companyId, forDate: dateOnly },
    }),
    prisma.inspirationTopic.groupBy({
      by: ['status'],
      where: { companyId, forDate: dateOnly },
      _count: true,
    }),
    prisma.inspirationTopic.groupBy({
      by: ['category'],
      where: { companyId, forDate: dateOnly, status: 'APPROVED' },
      _count: true,
    }),
  ])

  return {
    total,
    byStatus: byStatus.reduce(
      (acc, item) => ({ ...acc, [item.status]: item._count }),
      {} as Record<string, number>
    ),
    byCategory: byCategory.reduce(
      (acc, item) => ({ ...acc, [item.category]: item._count }),
      {} as Record<string, number>
    ),
  }
}

// ============================================
// CLEANUP
// ============================================

export async function expireOldTopics(companyId: string) {
  const now = new Date()

  return prisma.inspirationTopic.updateMany({
    where: {
      companyId,
      status: { in: ['PENDING', 'APPROVED'] },
      expiresAt: { lt: now },
    },
    data: {
      status: 'EXPIRED',
    },
  })
}

export async function deleteOldBriefings(companyId: string, daysToKeep: number = 30) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  return prisma.inspirationBriefing.deleteMany({
    where: {
      companyId,
      forDate: { lt: cutoffDate },
    },
  })
}
