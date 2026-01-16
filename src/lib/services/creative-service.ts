/**
 * Creative Hub Service
 * Database operations for marketing content generation
 */

import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

// ============================================
// TYPES
// ============================================

export type Platform =
  | 'linkedin'
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'meta_ad'
  | 'google_display'
  | 'linkedin_ad'

export type ContentType = 'social_post' | 'ad_creative'

export type ImageType =
  | 'before_after'
  | 'branded_graphic'
  | 'team_photo'
  | 'promotional'
  | 'service_showcase'
  | 'quote_card'
  | 'stat_graphic'

export type AspectRatio = '1:1' | '4:3' | '16:9' | '9:16' | '3:4'

export interface CreateProjectInput {
  companyId: string
  createdById: string
  name: string
  description?: string
  campaignGoal?: string
  targetAudience?: string
  brandVoice?: string
  defaultTone?: string
}

export interface CreateContentInput {
  projectId: string
  contentType: ContentType
  platform: Platform
  headline?: string
  primaryText: string
  description?: string
  callToAction?: string
  hashtags?: string[]
  adFormat?: string
  imageId?: string
  isAiGenerated?: boolean
  aiModel?: string
  aiGenerationData?: Prisma.InputJsonValue
  variationGroup?: string
  variationLabel?: string
}

export interface CreateImageInput {
  companyId: string
  projectId?: string
  name: string
  imageUrl?: string
  imageBase64?: string
  imageType: ImageType
  aspectRatio?: AspectRatio
  width?: number
  height?: number
  isAiGenerated?: boolean
  aiPrompt?: string
  aiModel?: string
  tags?: string[]
  category?: string
}

// ============================================
// PROJECTS
// ============================================

export async function createProject(input: CreateProjectInput) {
  return prisma.creativeProject.create({
    data: input,
    include: {
      contentItems: true,
      imageAssets: true,
    },
  })
}

export async function getProjectById(id: string) {
  return prisma.creativeProject.findUnique({
    where: { id },
    include: {
      contentItems: {
        include: { image: true },
        orderBy: { createdAt: 'desc' },
      },
      imageAssets: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export async function getProjectsByCompany(companyId: string, status?: string) {
  return prisma.creativeProject.findMany({
    where: {
      companyId,
      ...(status ? { status } : {}),
    },
    include: {
      contentItems: { select: { id: true, platform: true, status: true } },
      imageAssets: { select: { id: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function updateProject(
  id: string,
  data: Partial<CreateProjectInput>
) {
  return prisma.creativeProject.update({
    where: { id },
    data,
  })
}

export async function deleteProject(id: string) {
  return prisma.creativeProject.delete({
    where: { id },
  })
}

// ============================================
// CONTENT
// ============================================

export async function createContent(input: CreateContentInput) {
  return prisma.creativeContent.create({
    data: input,
    include: { image: true, project: true },
  })
}

export async function createManyContents(inputs: CreateContentInput[]) {
  return prisma.creativeContent.createMany({
    data: inputs,
  })
}

export async function getContentById(id: string) {
  return prisma.creativeContent.findUnique({
    where: { id },
    include: { image: true, project: true },
  })
}

export async function getContentByProject(projectId: string) {
  return prisma.creativeContent.findMany({
    where: { projectId },
    include: { image: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getContentByCompany(
  companyId: string,
  filters?: {
    platform?: Platform
    contentType?: ContentType
    status?: string
    limit?: number
  }
) {
  return prisma.creativeContent.findMany({
    where: {
      project: { companyId },
      ...(filters?.platform ? { platform: filters.platform } : {}),
      ...(filters?.contentType ? { contentType: filters.contentType } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: {
      image: true,
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit,
  })
}

export async function updateContent(
  id: string,
  data: Partial<Omit<CreateContentInput, 'projectId'>> & {
    status?: string
    approvedAt?: Date
    approvedById?: string
    exportedAt?: Date
    exportFormat?: string
  }
) {
  return prisma.creativeContent.update({
    where: { id },
    data,
    include: { image: true },
  })
}

export async function deleteContent(id: string) {
  return prisma.creativeContent.delete({
    where: { id },
  })
}

export async function getContentStats(companyId: string) {
  const [total, byPlatform, byStatus] = await Promise.all([
    prisma.creativeContent.count({
      where: { project: { companyId } },
    }),
    prisma.creativeContent.groupBy({
      by: ['platform'],
      where: { project: { companyId } },
      _count: true,
    }),
    prisma.creativeContent.groupBy({
      by: ['status'],
      where: { project: { companyId } },
      _count: true,
    }),
  ])

  return {
    total,
    byPlatform: byPlatform.reduce(
      (acc, item) => ({ ...acc, [item.platform]: item._count }),
      {} as Record<string, number>
    ),
    byStatus: byStatus.reduce(
      (acc, item) => ({ ...acc, [item.status]: item._count }),
      {} as Record<string, number>
    ),
  }
}

// ============================================
// IMAGES
// ============================================

export async function createImage(input: CreateImageInput) {
  return prisma.creativeImage.create({
    data: input,
  })
}

export async function getImageById(id: string) {
  return prisma.creativeImage.findUnique({
    where: { id },
    include: { contents: { select: { id: true, platform: true } } },
  })
}

export async function getImagesByCompany(
  companyId: string,
  filters?: {
    imageType?: ImageType
    category?: string
    projectId?: string
    status?: string
    limit?: number
  }
) {
  return prisma.creativeImage.findMany({
    where: {
      companyId,
      ...(filters?.imageType ? { imageType: filters.imageType } : {}),
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.projectId ? { projectId: filters.projectId } : {}),
      ...(filters?.status ? { status: filters.status } : { status: 'active' }),
    },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit,
  })
}

export async function getImagesByProject(projectId: string) {
  return prisma.creativeImage.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateImage(
  id: string,
  data: Partial<Omit<CreateImageInput, 'companyId'>>
) {
  return prisma.creativeImage.update({
    where: { id },
    data,
  })
}

export async function deleteImage(id: string) {
  return prisma.creativeImage.delete({
    where: { id },
  })
}

export async function getImageStats(companyId: string) {
  const [total, byType, aiGenerated] = await Promise.all([
    prisma.creativeImage.count({
      where: { companyId, status: 'active' },
    }),
    prisma.creativeImage.groupBy({
      by: ['imageType'],
      where: { companyId, status: 'active' },
      _count: true,
    }),
    prisma.creativeImage.count({
      where: { companyId, isAiGenerated: true, status: 'active' },
    }),
  ])

  return {
    total,
    aiGenerated,
    byType: byType.reduce(
      (acc, item) => ({ ...acc, [item.imageType]: item._count }),
      {} as Record<string, number>
    ),
  }
}

// ============================================
// TEMPLATES
// ============================================

export async function getTemplates(
  companyId: string,
  filters?: {
    contentType?: ContentType
    platform?: Platform
    isActive?: boolean
  }
) {
  return prisma.creativeTemplate.findMany({
    where: {
      OR: [{ companyId }, { isBuiltIn: true }],
      ...(filters?.contentType ? { contentType: filters.contentType } : {}),
      ...(filters?.platform ? { platform: filters.platform } : {}),
      ...(filters?.isActive !== undefined
        ? { isActive: filters.isActive }
        : { isActive: true }),
    },
    orderBy: [{ isBuiltIn: 'desc' }, { useCount: 'desc' }],
  })
}

export async function getTemplateById(id: string) {
  return prisma.creativeTemplate.findUnique({
    where: { id },
  })
}

export async function incrementTemplateUseCount(id: string) {
  return prisma.creativeTemplate.update({
    where: { id },
    data: {
      useCount: { increment: 1 },
      // lastUsedAt: new Date(), // Add this field to schema if needed
    },
  })
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats(companyId: string) {
  const [projects, contentStats, imageStats, recentContent] = await Promise.all(
    [
      prisma.creativeProject.count({
        where: { companyId, status: 'active' },
      }),
      getContentStats(companyId),
      getImageStats(companyId),
      getContentByCompany(companyId, { limit: 5 }),
    ]
  )

  return {
    activeProjects: projects,
    totalContent: contentStats.total,
    contentByPlatform: contentStats.byPlatform,
    contentByStatus: contentStats.byStatus,
    totalImages: imageStats.total,
    aiGeneratedImages: imageStats.aiGenerated,
    imagesByType: imageStats.byType,
    recentContent,
  }
}
