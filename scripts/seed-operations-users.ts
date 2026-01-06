// Seed script to create test managers and associates for operations testing
// Run with: npx tsx scripts/seed-operations-users.ts

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  console.log('🌱 Seeding operations test users (managers & associates)...\n')

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
  console.log(`🏢 Branch: ${branch.name}\n`)

  // Test users to create
  const testUsers = [
    // Managers
    {
      email: 'manager1@urbansimple.com',
      firstName: 'Carlos',
      lastName: 'Martinez',
      displayName: 'Carlos M.',
      role: 'MANAGER' as const,
      phone: '(512) 555-1001',
      password: 'Manager123!',
    },
    {
      email: 'manager2@urbansimple.com',
      firstName: 'Jennifer',
      lastName: 'Thompson',
      displayName: 'Jen T.',
      role: 'MANAGER' as const,
      phone: '(512) 555-1002',
      password: 'Manager123!',
    },
    // Associates
    {
      email: 'associate1@urbansimple.com',
      firstName: 'Miguel',
      lastName: 'Rodriguez',
      displayName: 'Miguel R.',
      role: 'ASSOCIATE' as const,
      phone: '(512) 555-2001',
      password: 'Associate123!',
    },
    {
      email: 'associate2@urbansimple.com',
      firstName: 'Maria',
      lastName: 'Garcia',
      displayName: 'Maria G.',
      role: 'ASSOCIATE' as const,
      phone: '(512) 555-2002',
      password: 'Associate123!',
    },
    {
      email: 'associate3@urbansimple.com',
      firstName: 'David',
      lastName: 'Lee',
      displayName: 'David L.',
      role: 'ASSOCIATE' as const,
      phone: '(512) 555-2003',
      password: 'Associate123!',
    },
    {
      email: 'associate4@urbansimple.com',
      firstName: 'Sofia',
      lastName: 'Hernandez',
      displayName: 'Sofia H.',
      role: 'ASSOCIATE' as const,
      phone: '(512) 555-2004',
      password: 'Associate123!',
    },
    {
      email: 'associate5@urbansimple.com',
      firstName: 'Antonio',
      lastName: 'Lopez',
      displayName: 'Antonio L.',
      role: 'ASSOCIATE' as const,
      phone: '(512) 555-2005',
      password: 'Associate123!',
    },
  ]

  console.log(`👥 Creating ${testUsers.length} test users...\n`)

  const credentials: Array<{ email: string; password: string; role: string }> = []

  for (const userData of testUsers) {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    })

    if (existing) {
      console.log(`  ⏭️  ${userData.firstName} ${userData.lastName} already exists`)
      
      // Check if they have auth credentials
      if (existing.authId) {
        console.log(`     ✓ Auth credentials already linked`)
      } else {
        console.log(`     ⚠️  No auth credentials - creating...`)
        // Try to create auth user and link
        try {
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true,
          })

          if (!authError && authData) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { authId: authData.user.id },
            })
            console.log(`     ✅ Created and linked auth credentials`)
            credentials.push({
              email: userData.email,
              password: userData.password,
              role: userData.role,
            })
          }
        } catch (error) {
          console.log(`     ⚠️  Could not create auth: ${error}`)
        }
      }
      continue
    }

    // Create Supabase auth user first
    let authUserId: string | null = null
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
      })

      if (authError) {
        // User might already exist
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          const { data: usersData } = await supabase.auth.admin.listUsers()
          const existingAuthUser = usersData?.users.find((u) => u.email === userData.email)
          if (existingAuthUser) {
            authUserId = existingAuthUser.id
            console.log(`  ℹ️  Auth user already exists: ${userData.email}`)
          }
        } else {
          console.warn(`  ⚠️  Could not create auth user: ${authError.message}`)
        }
      } else {
        authUserId = authData.user.id
        console.log(`  ✅ Created auth user: ${userData.email}`)
      }
    } catch (error) {
      console.warn(`  ⚠️  Error creating auth user: ${error}`)
    }

    // Create database user
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        branchId: branch.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: userData.displayName,
        phone: userData.phone,
        role: userData.role,
        isActive: true,
        authId: authUserId || undefined,
      },
    })

    console.log(`  ✅ Created ${user.firstName} ${user.lastName} (${user.role})`)

    // If they're an associate, create associate record
    if (userData.role === 'ASSOCIATE') {
      await prisma.associate.create({
        data: {
          userId: user.id,
          onboardingStatus: 'completed',
          startDate: new Date(),
          totalPoints: Math.floor(Math.random() * 500), // Random points for testing
        },
      })
      console.log(`     📋 Created associate record`)
    }

    if (authUserId) {
      credentials.push({
        email: userData.email,
        password: userData.password,
        role: userData.role,
      })
    }
  }

  console.log('\n✅ Operations users seeding complete!')
  
  if (credentials.length > 0) {
    console.log('\n📧 Login Credentials:')
    console.log('═'.repeat(60))
    
    const managers = credentials.filter((c) => c.role === 'MANAGER')
    const associates = credentials.filter((c) => c.role === 'ASSOCIATE')
    
    if (managers.length > 0) {
      console.log('\n👔 Managers:')
      managers.forEach((cred) => {
        console.log(`   ${cred.email} / ${cred.password}`)
      })
    }
    
    if (associates.length > 0) {
      console.log('\n🧹 Associates:')
      associates.forEach((cred) => {
        console.log(`   ${cred.email} / ${cred.password}`)
      })
    }
    
    console.log('\n' + '═'.repeat(60))
    console.log('\n💡 Tips:')
    console.log('   - Use these credentials to log in and test operations features')
    console.log('   - Managers can create shifts and assign locations')
    console.log('   - Associates can view their assigned locations and shifts')
    console.log('   - Test scheduling, checklists, and assignments')
    console.log('\n⚠️  IMPORTANT: Change passwords after testing!')
  }
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


