/**
 * Restaurant Creative Studio Service
 *
 * Database operations for brand kits and generated content
 */

import { prisma } from '@/lib/db'
import type { GenerationMode, OutputFormatId } from '@/lib/config/restaurant-studio'

// ============================================
// TYPES
// ============================================

export interface CreateBrandKitInput {
  companyId: string
  restaurantName: string
  logoUrl?: string
  iconUrl?: string
  primaryColor: string
  secondaryColor?: string
  accentColor?: string
  brandPhotos?: string[]
  cuisineType?: string
  preferredStyle?: string
  isDefault?: boolean
}

export interface UpdateBrandKitInput {
  restaurantName?: string
  logoUrl?: string
  iconUrl?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  brandPhotos?: string[]
  cuisineType?: string
  preferredStyle?: string
  isDefault?: boolean
}

export interface CreateContentInput {
  companyId: string
  brandKitId?: string
  mode: GenerationMode
  outputFormat?: OutputFormatId
  sourceImageUrl?: string
  generatedImageUrl?: string
  headline?: string
  bodyText?: string
  hashtags?: string[]
  aiPrompt?: string
  aiModel?: string
  status?: string
  platform?: string
}

export interface ContentFilters {
  mode?: GenerationMode
  status?: string
  outputFormat?: string
  limit?: number
  offset?: number
}

export interface StudioStats {
  totalGenerations: number
  generationsByMode: Record<string, number>
  generationsByFormat: Record<string, number>
  thisMonthGenerations: number
  savedContent: number
}

// ============================================
// BRAND KIT OPERATIONS
// ============================================

export async function createBrandKit(input: CreateBrandKitInput) {
  // If setting as default, unset other defaults first
  if (input.isDefault) {
    await prisma.restaurantBrandKit.updateMany({
      where: { companyId: input.companyId, isDefault: true },
      data: { isDefault: false },
    })
  }

  return prisma.restaurantBrandKit.create({
    data: {
      companyId: input.companyId,
      restaurantName: input.restaurantName,
      logoUrl: input.logoUrl,
      iconUrl: input.iconUrl,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      accentColor: input.accentColor,
      brandPhotos: input.brandPhotos || [],
      cuisineType: input.cuisineType,
      preferredStyle: input.preferredStyle,
      isDefault: input.isDefault || false,
    },
  })
}

export async function getBrandKitsByCompany(companyId: string) {
  return prisma.restaurantBrandKit.findMany({
    where: { companyId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function getBrandKitById(id: string) {
  return prisma.restaurantBrandKit.findUnique({
    where: { id },
  })
}

export async function getDefaultBrandKit(companyId: string) {
  // Try to get default, otherwise get most recent
  const defaultKit = await prisma.restaurantBrandKit.findFirst({
    where: { companyId, isDefault: true },
  })

  if (defaultKit) return defaultKit

  return prisma.restaurantBrandKit.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateBrandKit(id: string, data: UpdateBrandKitInput) {
  // If setting as default, need to get companyId first
  if (data.isDefault) {
    const existing = await prisma.restaurantBrandKit.findUnique({
      where: { id },
      select: { companyId: true },
    })

    if (existing) {
      await prisma.restaurantBrandKit.updateMany({
        where: { companyId: existing.companyId, isDefault: true },
        data: { isDefault: false },
      })
    }
  }

  return prisma.restaurantBrandKit.update({
    where: { id },
    data,
  })
}

export async function deleteBrandKit(id: string) {
  return prisma.restaurantBrandKit.delete({
    where: { id },
  })
}

// ============================================
// CONTENT OPERATIONS
// ============================================

export async function createStudioContent(input: CreateContentInput) {
  return prisma.restaurantStudioContent.create({
    data: {
      companyId: input.companyId,
      brandKitId: input.brandKitId,
      mode: input.mode,
      outputFormat: input.outputFormat,
      sourceImageUrl: input.sourceImageUrl,
      generatedImageUrl: input.generatedImageUrl,
      headline: input.headline,
      bodyText: input.bodyText,
      hashtags: input.hashtags || [],
      aiPrompt: input.aiPrompt,
      aiModel: input.aiModel,
      status: input.status || 'generated',
      platform: input.platform,
    },
    include: {
      brandKit: true,
    },
  })
}

export async function getContentByCompany(
  companyId: string,
  filters?: ContentFilters
) {
  const where: Record<string, unknown> = { companyId }

  if (filters?.mode) {
    where.mode = filters.mode
  }
  if (filters?.status) {
    where.status = filters.status
  }
  if (filters?.outputFormat) {
    where.outputFormat = filters.outputFormat
  }

  return prisma.restaurantStudioContent.findMany({
    where,
    include: {
      brandKit: {
        select: {
          id: true,
          restaurantName: true,
          primaryColor: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 50,
    skip: filters?.offset || 0,
  })
}

export async function getContentById(id: string) {
  return prisma.restaurantStudioContent.findUnique({
    where: { id },
    include: {
      brandKit: true,
    },
  })
}

export async function updateContentStatus(id: string, status: string) {
  return prisma.restaurantStudioContent.update({
    where: { id },
    data: { status },
  })
}

export async function updateContent(
  id: string,
  data: Partial<CreateContentInput>
) {
  return prisma.restaurantStudioContent.update({
    where: { id },
    data,
  })
}

export async function deleteContent(id: string) {
  return prisma.restaurantStudioContent.delete({
    where: { id },
  })
}

// ============================================
// STATS OPERATIONS
// ============================================

export async function getStudioStats(companyId: string): Promise<StudioStats> {
  // Get all content for stats
  const allContent = await prisma.restaurantStudioContent.findMany({
    where: { companyId },
    select: {
      mode: true,
      outputFormat: true,
      status: true,
      createdAt: true,
    },
  })

  // Calculate stats
  const totalGenerations = allContent.length

  const generationsByMode: Record<string, number> = {}
  const generationsByFormat: Record<string, number> = {}
  let savedContent = 0

  // Get start of current month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  let thisMonthGenerations = 0

  for (const content of allContent) {
    // By mode
    generationsByMode[content.mode] =
      (generationsByMode[content.mode] || 0) + 1

    // By format
    if (content.outputFormat) {
      generationsByFormat[content.outputFormat] =
        (generationsByFormat[content.outputFormat] || 0) + 1
    }

    // Saved count
    if (content.status === 'saved' || content.status === 'published') {
      savedContent++
    }

    // This month
    if (content.createdAt >= monthStart) {
      thisMonthGenerations++
    }
  }

  return {
    totalGenerations,
    generationsByMode,
    generationsByFormat,
    thisMonthGenerations,
    savedContent,
  }
}

// ============================================
// RECENT CONTENT FOR DASHBOARD
// ============================================

export async function getRecentContent(companyId: string, limit: number = 6) {
  return prisma.restaurantStudioContent.findMany({
    where: { companyId },
    include: {
      brandKit: {
        select: {
          id: true,
          restaurantName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
