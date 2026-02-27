/**
 * Brand Asset Service
 *
 * CRUD operations for the brand asset library.
 * Assets are stored in Supabase Storage with metadata in Prisma.
 */

import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'

const BUCKET_NAME = 'brand_assets'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

// ============================================
// TYPES
// ============================================

export interface CreateBrandAssetInput {
  companyId: string
  name: string
  description?: string
  category?: string
  tags?: string[]
  fileBuffer: Buffer
  fileName: string
  mimeType: string
  fileSize: number
}

export interface BrandAssetFilters {
  category?: string
  search?: string
  limit?: number
}

// ============================================
// OPERATIONS
// ============================================

export async function createBrandAsset(input: CreateBrandAssetInput) {
  const {
    companyId,
    name,
    description,
    category = 'general',
    tags = [],
    fileBuffer,
    fileName,
    mimeType,
    fileSize,
  } = input

  // Upload to Supabase Storage
  const ext = fileName.split('.').pop() || 'png'
  const storagePath = `${companyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const supabase = getSupabaseAdmin()
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath)

  const imageUrl = urlData.publicUrl

  // Create DB record
  return prisma.brandAsset.create({
    data: {
      companyId,
      name,
      description,
      imageUrl,
      storagePath,
      category,
      tags,
      fileSize,
      mimeType,
    },
  })
}

export async function getBrandAssets(companyId: string, filters?: BrandAssetFilters) {
  const where: Record<string, unknown> = { companyId }

  if (filters?.category && filters.category !== 'all') {
    where.category = filters.category
  }

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { tags: { has: filters.search.toLowerCase() } },
    ]
  }

  return prisma.brandAsset.findMany({
    where,
    orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
    take: filters?.limit || 50,
  })
}

export async function getBrandAssetById(id: string) {
  return prisma.brandAsset.findUnique({ where: { id } })
}

export async function getBrandAssetsByIds(ids: string[]) {
  return prisma.brandAsset.findMany({
    where: { id: { in: ids } },
  })
}

export async function deleteBrandAsset(id: string, companyId: string) {
  // Verify ownership
  const asset = await prisma.brandAsset.findUnique({ where: { id } })
  if (!asset || asset.companyId !== companyId) {
    throw new Error('Asset not found')
  }

  // Delete from Supabase Storage
  const supabase = getSupabaseAdmin()
  await supabase.storage.from(BUCKET_NAME).remove([asset.storagePath])

  // Delete DB record
  return prisma.brandAsset.delete({ where: { id } })
}

export async function incrementAssetUsage(assetIds: string[]) {
  if (assetIds.length === 0) return

  await prisma.brandAsset.updateMany({
    where: { id: { in: assetIds } },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  })
}

export async function countBrandAssets(companyId: string) {
  return prisma.brandAsset.count({ where: { companyId } })
}
