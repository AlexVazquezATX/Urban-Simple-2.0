// Seed script to create test users for testing team features
// Run with: npm run db:seed-users

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

async function main() {
  console.log('🌱 Seeding test users...')

  // Get the first company and branch
  const company = await prisma.company.findFirst()
  if (!company) {
    throw new Error('No company found. Please run main seed script first.')
  }

  const branch = await prisma.branch.findFirst({
    where: { companyId: company.id },
  })

  if (!branch) {
    throw new Error('No branch found. Please run main seed script first.')
  }

  console.log(`📍 Company: ${company.name}`)
  console.log(`🏢 Branch: ${branch.name}`)

  // Test users to create
  const testUsers = [
    {
      email: 'sarah.johnson@urbansimple.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      displayName: 'Sarah J.',
      role: 'MANAGER',
    },
    {
      email: 'mike.chen@urbansimple.com',
      firstName: 'Mike',
      lastName: 'Chen',
      displayName: 'Mike',
      role: 'ASSOCIATE',
    },
    {
      email: 'emily.rodriguez@urbansimple.com',
      firstName: 'Emily',
      lastName: 'Rodriguez',
      displayName: 'Emily R.',
      role: 'ASSOCIATE',
    },
    {
      email: 'james.wilson@urbansimple.com',
      firstName: 'James',
      lastName: 'Wilson',
      displayName: null, // Will use full name
      role: 'ASSOCIATE',
    },
  ]

  console.log(`\n👥 Creating ${testUsers.length} test users...\n`)

  for (const userData of testUsers) {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    })

    if (existing) {
      console.log(`  ⏭️  ${userData.firstName} ${userData.lastName} already exists`)
      continue
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        branchId: branch.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: userData.displayName,
        role: userData.role as any,
        isActive: true,
        // Note: authId is null - these are test users without Supabase auth
        // They won't be able to log in, but will appear in the system
      },
    })

    console.log(
      `  ✅ Created ${user.firstName} ${user.lastName} (${user.role})`
    )

    // If they're an associate, create associate record
    if (userData.role === 'ASSOCIATE') {
      await prisma.associate.create({
        data: {
          userId: user.id,
          onboardingStatus: 'completed',
          totalPoints: Math.floor(Math.random() * 500), // Random points for testing
        },
      })
      console.log(`     📋 Created associate record`)
    }
  }

  console.log('\n✅ Test users seeding complete!')
  console.log('\n💡 Tips:')
  console.log('   - Start a DM with any of these users')
  console.log('   - Create private channels and invite them')
  console.log('   - Test @mentions (coming soon!)')
  console.log('   - View them in the Members dialog')
  console.log('\n⚠️  Note: These users cannot log in (no auth credentials)')
  console.log('   They exist only for testing team features')
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
