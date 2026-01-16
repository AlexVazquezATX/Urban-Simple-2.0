/**
 * Blog Service
 * Handles all blog post CRUD operations and category management
 */

import { prisma } from '@/lib/db'
import type { BlogPost, BlogCategory, Prisma } from '@prisma/client'

// Types
export type BlogPostWithRelations = Prisma.BlogPostGetPayload<{
  include: {
    category: true
    author: {
      select: {
        id: true
        firstName: true
        lastName: true
        displayName: true
        avatarUrl: true
      }
    }
  }
}>

export interface CreateBlogPostInput {
  title: string
  slug: string
  excerpt: string | null
  content: string
  categoryId: string
  authorId: string
  metaTitle?: string | null
  metaDescription?: string | null
  keywords?: string[]
  featuredImage?: string | null
  featuredImagePrompt?: string | null
  imageAltText?: string | null
  status?: 'draft' | 'published' | 'archived'
  readTime?: number | null
  isAiGenerated?: boolean
  aiModel?: string | null
  aiGenerationData?: Prisma.InputJsonValue
  targetArea?: string | null
  contentFocus?: string | null
  targetAudience?: string | null
  tone?: string | null
}

export interface UpdateBlogPostInput extends Partial<CreateBlogPostInput> {
  id: string
}

// ============================================
// BLOG CATEGORIES
// ============================================

/**
 * Get all active blog categories
 */
export async function getAllCategories(): Promise<BlogCategory[]> {
  return prisma.blogCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
}

/**
 * Get category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<BlogCategory | null> {
  return prisma.blogCategory.findUnique({
    where: { slug },
  })
}

/**
 * Create blog category
 */
export async function createCategory(data: {
  name: string
  slug: string
  description?: string | null
  color?: string | null
  icon?: string | null
  sortOrder?: number
}): Promise<BlogCategory> {
  return prisma.blogCategory.create({
    data,
  })
}

// ============================================
// BLOG POSTS
// ============================================

/**
 * Get all published blog posts (public view)
 */
export async function getPublishedPosts(options?: {
  categoryId?: string
  limit?: number
  offset?: number
}): Promise<BlogPostWithRelations[]> {
  return prisma.blogPost.findMany({
    where: {
      status: 'published',
      ...(options?.categoryId && { categoryId: options.categoryId }),
    },
    include: {
      category: true,
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: options?.limit,
    skip: options?.offset,
  })
}

/**
 * Get single blog post by slug (public view)
 */
export async function getPostBySlug(slug: string): Promise<BlogPostWithRelations | null> {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: {
      category: true,
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  })

  // Increment view count if post found and published
  if (post && post.status === 'published') {
    await prisma.blogPost.update({
      where: { id: post.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    })
  }

  return post
}

/**
 * Get all blog posts (admin view - includes drafts)
 */
export async function getAllPosts(options?: {
  status?: 'draft' | 'published' | 'archived'
  categoryId?: string
  authorId?: string
  limit?: number
  offset?: number
}): Promise<BlogPostWithRelations[]> {
  return prisma.blogPost.findMany({
    where: {
      ...(options?.status && { status: options.status }),
      ...(options?.categoryId && { categoryId: options.categoryId }),
      ...(options?.authorId && { authorId: options.authorId }),
    },
    include: {
      category: true,
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit,
    skip: options?.offset,
  })
}

/**
 * Get single blog post by ID (admin view)
 */
export async function getPostById(id: string): Promise<BlogPostWithRelations | null> {
  return prisma.blogPost.findUnique({
    where: { id },
    include: {
      category: true,
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  })
}

/**
 * Create blog post
 */
export async function createBlogPost(data: CreateBlogPostInput): Promise<BlogPost> {
  const { categoryId, authorId, ...rest } = data
  return prisma.blogPost.create({
    data: {
      ...rest,
      publishedAt: data.status === 'published' ? new Date() : null,
      category: { connect: { id: categoryId } },
      author: { connect: { id: authorId } },
    },
  })
}

/**
 * Update blog post
 */
export async function updateBlogPost(data: UpdateBlogPostInput): Promise<BlogPost> {
  const { id, categoryId, authorId, ...updateData } = data

  // Get current post to check status change
  const currentPost = await prisma.blogPost.findUnique({
    where: { id },
    select: { status: true, publishedAt: true },
  })

  // Set publishedAt when transitioning from draft to published
  const publishedAt =
    currentPost?.status === 'draft' && updateData.status === 'published'
      ? new Date()
      : currentPost?.publishedAt

  return prisma.blogPost.update({
    where: { id },
    data: {
      ...updateData,
      publishedAt,
      ...(categoryId && { category: { connect: { id: categoryId } } }),
      ...(authorId && { author: { connect: { id: authorId } } }),
    },
  })
}

/**
 * Delete blog post
 */
export async function deleteBlogPost(id: string): Promise<void> {
  await prisma.blogPost.delete({
    where: { id },
  })
}

/**
 * Publish blog post
 */
export async function publishPost(id: string): Promise<BlogPost> {
  return prisma.blogPost.update({
    where: { id },
    data: {
      status: 'published',
      publishedAt: new Date(),
    },
  })
}

/**
 * Unpublish blog post (back to draft)
 */
export async function unpublishPost(id: string): Promise<BlogPost> {
  return prisma.blogPost.update({
    where: { id },
    data: {
      status: 'draft',
    },
  })
}

/**
 * Get recent posts for sidebar/related posts
 */
export async function getRecentPosts(limit: number = 5, excludeId?: string): Promise<BlogPostWithRelations[]> {
  return prisma.blogPost.findMany({
    where: {
      status: 'published',
      ...(excludeId && { id: { not: excludeId } }),
    },
    include: {
      category: true,
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })
}

/**
 * Get posts by category
 */
export async function getPostsByCategory(
  categoryId: string,
  limit?: number
): Promise<BlogPostWithRelations[]> {
  return getPublishedPosts({ categoryId, limit })
}

/**
 * Search published posts
 */
export async function searchPosts(query: string, limit: number = 10): Promise<BlogPostWithRelations[]> {
  return prisma.blogPost.findMany({
    where: {
      status: 'published',
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { excerpt: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { keywords: { has: query.toLowerCase() } },
      ],
    },
    include: {
      category: true,
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })
}
