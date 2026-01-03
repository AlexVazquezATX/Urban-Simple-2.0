// Script to create Supabase auth user for existing admin
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const adminEmail = 'alex@urbansimple.net'
const adminPassword = 'UrbanSimple2024!' // You can change this after first login

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

const prisma = new PrismaClient()

async function createAdminAuth() {
  console.log('🔐 Creating Supabase auth user for:', adminEmail)

  // Check if user already exists in Supabase auth
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingAuthUser = existingUsers?.users.find(u => u.email === adminEmail)

  if (existingAuthUser) {
    console.log('ℹ️  Auth user already exists with ID:', existingAuthUser.id)

    // Link to database user if not already linked
    const dbUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    })

    if (dbUser && !dbUser.authId) {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { authId: existingAuthUser.id },
      })
      console.log('✅ Linked existing auth user to database user')
    } else if (dbUser && dbUser.authId === existingAuthUser.id) {
      console.log('✅ Auth user already linked to database user')
    }

    console.log('\n📧 Login credentials:')
    console.log('   Email:', adminEmail)
    console.log('   Password: [Use existing password or reset in Supabase dashboard]')
    console.log('\n💡 To reset password, visit:')
    console.log('   https://supabase.com/dashboard/project/rftsmrdfnsejaxzzsslq/auth/users')

    return
  }

  // Create new auth user
  console.log('Creating new auth user...')
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true, // Auto-confirm email
  })

  if (authError) {
    console.error('❌ Error creating auth user:', authError.message)
    process.exit(1)
  }

  console.log('✅ Created Supabase auth user with ID:', authData.user.id)

  // Link to database user
  const dbUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (dbUser) {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { authId: authData.user.id },
    })
    console.log('✅ Linked auth user to database user')
  } else {
    console.log('⚠️  Database user not found - you may need to run the seed script first')
  }

  console.log('\n📧 Login credentials:')
  console.log('   Email:', adminEmail)
  console.log('   Password:', adminPassword)
  console.log('\n⚠️  IMPORTANT: Change this password after first login!')
  console.log('\nYou can now login at: http://localhost:3001/login')
}

createAdminAuth()
  .catch((e) => {
    console.error('❌ Failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
