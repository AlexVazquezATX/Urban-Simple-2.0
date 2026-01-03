// Seed script for team chat demo data
// Run with: npx tsx scripts/seed-chat.ts

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

async function main() {
  console.log('🌱 Seeding team chat demo data...')

  // Get the first company and users
  const company = await prisma.company.findFirst()
  if (!company) {
    throw new Error('No company found. Please run main seed script first.')
  }

  const users = await prisma.user.findMany({
    where: { companyId: company.id },
    take: 3,
  })

  if (users.length === 0) {
    throw new Error('No users found. Please run main seed script first.')
  }

  console.log(`📍 Found company: ${company.name}`)
  console.log(`👥 Found ${users.length} users`)

  // Create demo channels
  const channels = [
    {
      name: 'General',
      slug: 'general',
      description: 'Company-wide announcements and general discussion',
      type: 'public',
    },
    {
      name: 'Operations',
      slug: 'operations',
      description: 'Day-to-day operations and scheduling',
      type: 'public',
    },
    {
      name: 'Client Updates',
      slug: 'client-updates',
      description: 'Client feedback and important updates',
      type: 'public',
    },
  ]

  console.log('📢 Creating channels...')

  for (const channelData of channels) {
    // Check if channel already exists
    const existing = await prisma.channel.findFirst({
      where: {
        companyId: company.id,
        slug: channelData.slug,
      },
    })

    if (existing) {
      console.log(`  ⏭️  Channel #${channelData.slug} already exists, skipping`)
      continue
    }

    const channel = await prisma.channel.create({
      data: {
        ...channelData,
        companyId: company.id,
        createdById: users[0].id,
      },
    })

    console.log(`  ✅ Created channel: #${channel.slug}`)

    // Add all users as members
    for (const user of users) {
      await prisma.channelMember.create({
        data: {
          channelId: channel.id,
          userId: user.id,
          role: user.id === users[0].id ? 'owner' : 'member',
        },
      })
    }

    // Add demo messages
    const demoMessages = getDemoMessages(channelData.slug, users)
    for (const msg of demoMessages) {
      await prisma.message.create({
        data: {
          channelId: channel.id,
          userId: msg.userId,
          content: msg.content,
          contentType: 'text',
        },
      })
    }

    console.log(`  💬 Added ${demoMessages.length} demo messages`)
  }

  console.log('✅ Team chat seeding complete!')
}

function getDemoMessages(
  channelSlug: string,
  users: any[]
): Array<{ userId: string; content: string }> {
  const user1 = users[0]
  const user2 = users[1] || user1
  const user3 = users[2] || user1

  const messagesByChannel: Record<string, Array<{ userId: string; content: string }>> = {
    general: [
      {
        userId: user1.id,
        content: 'Welcome to Urban Simple team chat! 🎉',
      },
      {
        userId: user2.id,
        content: 'Thanks! Excited to use this instead of juggling multiple tools.',
      },
      {
        userId: user1.id,
        content:
          'Exactly! Now we have billing, invoicing, AND team chat all in one place.',
      },
      {
        userId: user3.id,
        content: 'Love the AI assistant integration too!',
      },
    ],
    operations: [
      {
        userId: user1.id,
        content: 'Team, we have 3 new service agreements starting next week.',
      },
      {
        userId: user2.id,
        content: 'Got it. Do we need to schedule any onboarding calls?',
      },
      {
        userId: user1.id,
        content:
          'Yes, I\'ll send calendar invites. Austin Storage wants to meet Tuesday at 2pm.',
      },
    ],
    'client-updates': [
      {
        userId: user2.id,
        content: 'Austin Storage just submitted a payment! Check invoice #INV-1001.',
      },
      {
        userId: user1.id,
        content:
          'Awesome! That clears their 45-day overdue balance. I\'ll send them a thank you note.',
      },
      {
        userId: user3.id,
        content: 'Great news! They mentioned they might add 2 more locations too.',
      },
    ],
  }

  return messagesByChannel[channelSlug] || []
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
