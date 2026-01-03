// Seed script to create initial company, branch, and admin user
// Run with: npm run db:seed or npx prisma db seed
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env for auto-creating auth user
// If not set, you'll need to manually create the auth user and link it

// IMPORTANT: Load environment variables BEFORE importing PrismaClient
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env file explicitly - must be done before PrismaClient import
config({ path: resolve(process.cwd(), '.env') })

// Ensure DATABASE_URL is available before importing Prisma
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Environment variables loaded:', Object.keys(process.env).filter(k => k.includes('DATABASE')))
  throw new Error('DATABASE_URL environment variable is not set. Make sure you have a .env file with DATABASE_URL configured.')
}

// Debug: Verify DATABASE_URL is loaded
console.log('DATABASE_URL loaded:', databaseUrl ? 'Yes (' + databaseUrl.substring(0, 30) + '...)' : 'No')

// Set DATABASE_URL explicitly on process.env to ensure it's available
process.env.DATABASE_URL = databaseUrl

// Now import PrismaClient after env vars are loaded
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

// Prisma 7: Use same pattern as src/lib/db/index.ts
// The log option should work fine - the earlier error might have been a red herring
const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

async function main() {
  console.log('🌱 Seeding database...')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  }

  // Create Supabase admin client (if service role key is available)
  const supabaseAdmin = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null

  // 1. Create Company
  let company = await prisma.company.findFirst({
    where: { name: 'Urban Simple LLC' },
  })

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Urban Simple LLC',
        legalName: 'Urban Simple LLC',
        email: 'info@urbansimple.net',
        website: 'https://urbansimple.net',
        settings: {},
      },
    })
    console.log('✅ Created company:', company.name)
  } else {
    console.log('ℹ️  Company already exists:', company.name)
  }

  // 2. Create Austin Branch
  let branch = await prisma.branch.findFirst({
    where: { code: 'AUS' },
  })

  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        companyId: company.id,
        name: 'Austin',
        code: 'AUS',
        timezone: 'America/Chicago',
        isActive: true,
      },
    })
    console.log('✅ Created branch:', branch.name)
  } else {
    console.log('ℹ️  Branch already exists:', branch.name)
  }

  // 3. Create Admin User
  const adminEmail = 'alex@urbansimple.net' // Update with your email
  const adminPassword = randomBytes(16).toString('hex') // Generate random password
  
  let user = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  let authUserId: string | null = null

  if (!user) {
    // Try to create Supabase auth user if service role key is available
    if (supabaseAdmin) {
      try {
        // Try to create new auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true, // Auto-confirm email
        })

        if (authError) {
          // User might already exist, try to find them
          if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
            // List users and find by email
            const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
            const existingUser = usersData?.users.find((u) => u.email === adminEmail)
            if (existingUser) {
              authUserId = existingUser.id
              console.log('ℹ️  Auth user already exists:', adminEmail)
            } else {
              console.warn('⚠️  Could not find existing auth user:', authError.message)
              console.log('   You can create it manually in Supabase dashboard')
            }
          } else {
            console.warn('⚠️  Could not create auth user:', authError.message)
            console.log('   You can create it manually in Supabase dashboard')
          }
        } else {
          authUserId = authData.user.id
          console.log('✅ Created Supabase auth user:', adminEmail)
          console.log('   Temporary password:', adminPassword)
          console.log('   ⚠️  CHANGE THIS PASSWORD AFTER FIRST LOGIN!')
        }
      } catch (error) {
        console.warn('⚠️  Error creating auth user:', error)
        console.log('   You can create it manually in Supabase dashboard')
      }
    } else {
      console.log('ℹ️  SUPABASE_SERVICE_ROLE_KEY not set - skipping auth user creation')
      console.log('   To auto-create auth user, add SUPABASE_SERVICE_ROLE_KEY to .env')
    }

    // Create User record
    user = await prisma.user.create({
      data: {
        companyId: company.id,
        branchId: branch.id,
        email: adminEmail,
        firstName: 'Alex',
        lastName: 'Vazquez',
        displayName: 'Alex Vazquez',
        role: 'SUPER_ADMIN',
        isActive: true,
        authId: authUserId || undefined,
      },
    })
    console.log('✅ Created user:', user.email)

    if (!authUserId) {
      console.log('')
      console.log('⚠️  MANUAL SETUP REQUIRED:')
      console.log('   1. Sign up in Supabase Auth with email:', adminEmail)
      console.log('   2. Get the auth user ID from Supabase dashboard')
      console.log('   3. Update user record:')
      console.log(`      UPDATE users SET auth_id = '<auth_user_id>' WHERE email = '${adminEmail}';`)
      console.log('   4. Or run: npx prisma studio and update manually')
    }
  } else {
    console.log('ℹ️  User already exists:', user.email)
    
    // If user exists but no authId, try to link it
    if (!user.authId && supabaseAdmin) {
      try {
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
        const authUser = usersData?.users.find((u) => u.email === adminEmail)
        if (authUser) {
          await prisma.user.update({
            where: { id: user.id },
            data: { authId: authUser.id },
          })
          console.log('✅ Linked existing auth user to database user')
        }
      } catch (error) {
        // Ignore errors - user might not exist in auth yet
      }
    }
  }

  console.log('')
  console.log('✨ Seeding complete!')
  if (authUserId && adminPassword) {
    console.log('')
    console.log('📧 Login credentials:')
    console.log('   Email:', adminEmail)
    console.log('   Password:', adminPassword)
    console.log('   ⚠️  CHANGE THIS PASSWORD AFTER FIRST LOGIN!')
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



