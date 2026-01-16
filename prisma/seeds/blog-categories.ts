/**
 * Seed blog categories for Austin-focused content
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedBlogCategories() {
  console.log('📝 Seeding blog categories...')

  const categories = [
    {
      name: 'Austin Events',
      slug: 'austin-events',
      description: 'Upcoming events, festivals, and happenings around Austin',
      color: '#2E7FB8', // Ocean blue
      icon: 'Calendar',
      sortOrder: 1,
    },
    {
      name: 'Restaurant News',
      slug: 'restaurant-news',
      description: 'New openings, closures, and what\'s happening in Austin\'s restaurant scene',
      color: '#A67C52', // Bronze
      icon: 'UtensilsCrossed',
      sortOrder: 2,
    },
    {
      name: 'Food & Dining',
      slug: 'food-dining',
      description: 'Reviews, guides, and the best places to eat in Austin',
      color: '#C67D5B', // Terracotta
      icon: 'ChefHat',
      sortOrder: 3,
    },
    {
      name: 'Hospitality Industry',
      slug: 'hospitality-industry',
      description: 'Insights, tips, and trends for hospitality professionals',
      color: '#7E5B8F', // Plum
      icon: 'Hotel',
      sortOrder: 4,
    },
    {
      name: 'Austin Lifestyle',
      slug: 'austin-lifestyle',
      description: 'Culture, entertainment, and what makes Austin unique',
      color: '#8BA88A', // Sage
      icon: 'Sparkles',
      sortOrder: 5,
    },
    {
      name: 'Business & Operations',
      slug: 'business-operations',
      description: 'Tips and insights for running a successful hospitality business',
      color: '#CC9F5A', // Honey
      icon: 'BarChart3',
      sortOrder: 6,
    },
  ]

  for (const category of categories) {
    await prisma.blogCategory.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    })
  }

  console.log(`✅ Seeded ${categories.length} blog categories`)
}

// Run if called directly
if (require.main === module) {
  seedBlogCategories()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
