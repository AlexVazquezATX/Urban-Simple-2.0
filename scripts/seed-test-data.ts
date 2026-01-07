// Seed test data for role-based testing
// Creates test users (Manager, Associate, Client) and connected data
// Run with: npx tsx scripts/seed-test-data.ts

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding test data for role-based testing...\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials')
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Get existing company and branch
  const company = await prisma.company.findFirst()
  const branch = await prisma.branch.findFirst()

  if (!company || !branch) {
    throw new Error('Company and branch must exist. Run main seed first.')
  }

  // 1. CREATE TEST MANAGER
  console.log('👤 Creating test Manager...')
  const managerEmail = 'manager@urbansimple.net'
  const managerPassword = 'TestManager123!'

  let managerAuthId: string | null = null
  try {
    const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
      email: managerEmail,
      password: managerPassword,
      email_confirm: true,
    })
    if (authData?.user) {
      managerAuthId = authData.user.id
      console.log('  ✅ Created Supabase auth user')
    } else if (error?.message.includes('already')) {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = usersData?.users.find((u) => u.email === managerEmail)
      if (existingUser) {
        managerAuthId = existingUser.id
        console.log('  ℹ️  Supabase auth user already exists')
      }
    }
  } catch (e) {
    console.log('  ⚠️  Could not create Supabase user, will create DB user only')
  }

  const testManager = await prisma.user.upsert({
    where: { email: managerEmail },
    update: { role: 'MANAGER', authId: managerAuthId || undefined },
    create: {
      companyId: company.id,
      branchId: branch.id,
      email: managerEmail,
      firstName: 'Test',
      lastName: 'Manager',
      displayName: 'Test Manager',
      role: 'MANAGER',
      isActive: true,
      authId: managerAuthId || undefined,
    },
  })
  console.log(`  ✅ Manager user: ${testManager.email}\n`)

  // 2. CREATE TEST ASSOCIATE
  console.log('👤 Creating test Associate...')
  const associateEmail = 'associate@urbansimple.net'
  const associatePassword = 'TestAssociate123!'

  let associateAuthId: string | null = null
  try {
    const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
      email: associateEmail,
      password: associatePassword,
      email_confirm: true,
    })
    if (authData?.user) {
      associateAuthId = authData.user.id
      console.log('  ✅ Created Supabase auth user')
    } else if (error?.message.includes('already')) {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = usersData?.users.find((u) => u.email === associateEmail)
      if (existingUser) {
        associateAuthId = existingUser.id
        console.log('  ℹ️  Supabase auth user already exists')
      }
    }
  } catch (e) {
    console.log('  ⚠️  Could not create Supabase user, will create DB user only')
  }

  const testAssociate = await prisma.user.upsert({
    where: { email: associateEmail },
    update: { role: 'ASSOCIATE', authId: associateAuthId || undefined },
    create: {
      companyId: company.id,
      branchId: branch.id,
      email: associateEmail,
      firstName: 'Test',
      lastName: 'Associate',
      displayName: 'Test Associate',
      role: 'ASSOCIATE',
      isActive: true,
      authId: associateAuthId || undefined,
    },
  })
  console.log(`  ✅ Associate user: ${testAssociate.email}\n`)

  // 3. CREATE TEST CLIENT COMPANY
  console.log('🏢 Creating test Client...')
  let testClient = await prisma.client.findFirst({
    where: { name: 'Test Client Company' },
  })

  if (!testClient) {
    testClient = await prisma.client.create({
      data: {
        companyId: company.id,
        branchId: branch.id,
        name: 'Test Client Company',
        legalName: 'Test Client Company LLC',
        billingEmail: 'billing@testclient.com',
        phone: '512-555-0100',
        status: 'active',
        paymentTerms: 'NET_30',
      },
    })
    console.log(`  ✅ Client created: ${testClient.name}`)
  } else {
    console.log(`  ℹ️  Client already exists: ${testClient.name}`)
  }
  console.log()

  // 4. CREATE TEST CLIENT USER
  console.log('👤 Creating test Client User...')
  const clientUserEmail = 'client@testclient.com'
  const clientUserPassword = 'TestClient123!'

  let clientAuthId: string | null = null
  try {
    const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
      email: clientUserEmail,
      password: clientUserPassword,
      email_confirm: true,
    })
    if (authData?.user) {
      clientAuthId = authData.user.id
      console.log('  ✅ Created Supabase auth user')
    } else if (error?.message.includes('already')) {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = usersData?.users.find((u) => u.email === clientUserEmail)
      if (existingUser) {
        clientAuthId = existingUser.id
        console.log('  ℹ️  Supabase auth user already exists')
      }
    }
  } catch (e) {
    console.log('  ⚠️  Could not create Supabase user, will create DB user only')
  }

  const testClientUser = await prisma.user.upsert({
    where: { email: clientUserEmail },
    update: { role: 'CLIENT_USER', authId: clientAuthId || undefined },
    create: {
      companyId: company.id,
      branchId: branch.id,
      email: clientUserEmail,
      firstName: 'Test',
      lastName: 'Client',
      displayName: 'Test Client',
      role: 'CLIENT_USER',
      isActive: true,
      authId: clientAuthId || undefined,
    },
  })
  console.log(`  ✅ Client user: ${testClientUser.email}`)

  // Link client user to client company via ClientContact
  await prisma.clientContact.upsert({
    where: { id: testClientUser.id }, // Will fail first time, that's ok
    update: {},
    create: {
      clientId: testClient.id,
      userId: testClientUser.id,
      firstName: testClientUser.firstName,
      lastName: testClientUser.lastName,
      email: testClientUser.email,
      role: 'primary',
      isPortalUser: true,
      portalAccessGranted: new Date(),
    },
  }).catch(() => {
    // Contact might already exist
    console.log('  ℹ️  Client contact already linked')
  })
  console.log()

  // 5. CREATE TEST LOCATIONS
  console.log('📍 Creating test Locations...')

  const locationData = [
    {
      name: 'Downtown Office Building',
      address: { street: '123 Congress Ave', city: 'Austin', state: 'TX', zip: '78701' },
    },
    {
      name: 'Westside Corporate Park',
      address: { street: '456 Lamar Blvd', city: 'Austin', state: 'TX', zip: '78703' },
    },
    {
      name: 'South Austin Retail Center',
      address: { street: '789 South 1st St', city: 'Austin', state: 'TX', zip: '78704' },
    },
  ]

  const locations = []
  for (const locData of locationData) {
    let location = await prisma.location.findFirst({
      where: {
        clientId: testClient.id,
        name: locData.name,
      },
    })

    if (!location) {
      location = await prisma.location.create({
        data: {
          clientId: testClient.id,
          branchId: branch.id,
          name: locData.name,
          address: JSON.stringify(locData.address),
        },
      })
      console.log(`  ✅ Created location: ${location.name}`)
    } else {
      console.log(`  ℹ️  Location already exists: ${location.name}`)
    }
    locations.push(location)
  }
  console.log()

  console.log('✅ Test data created successfully!\n')
  console.log('📝 NOTE: Use the Schedule UI to create shifts and assign the test manager to the test locations.')

  // Print summary
  console.log('✨ Test data seeding complete!\n')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('📋 TEST ACCOUNTS CREATED')
  console.log('═══════════════════════════════════════════════════════════\n')

  console.log('👤 MANAGER ACCOUNT:')
  console.log(`   Email:    ${managerEmail}`)
  console.log(`   Password: ${managerPassword}`)
  console.log(`   Role:     MANAGER\n`)

  console.log('👤 ASSOCIATE ACCOUNT:')
  console.log(`   Email:    ${associateEmail}`)
  console.log(`   Password: ${associatePassword}`)
  console.log(`   Role:     ASSOCIATE\n`)

  console.log('👤 CLIENT USER ACCOUNT:')
  console.log(`   Email:    ${clientUserEmail}`)
  console.log(`   Password: ${clientUserPassword}`)
  console.log(`   Role:     CLIENT_USER`)
  console.log(`   Company:  ${testClient.name}`)
  console.log(`   Locations: 3\n`)

  console.log('═══════════════════════════════════════════════════════════')
  console.log('🧪 TESTING WORKFLOW')
  console.log('═══════════════════════════════════════════════════════════\n')

  console.log('1. Login as alex@urbansimple.net (SUPER_ADMIN)')
  console.log('   - Use Schedule UI to create a shift for Test Manager')
  console.log('   - Assign the shift to the 3 test locations created\n')

  console.log('2. Login as manager@urbansimple.net (MANAGER)')
  console.log('   - Go to "Nightly Reviews"')
  console.log('   - See assigned locations to review')
  console.log('   - Complete reviews with checklists and pain points\n')

  console.log('3. Login as alex@urbansimple.net (SUPER_ADMIN)')
  console.log('   - View submitted reviews in admin interface\n')

  console.log('4. Login as client@testclient.com (CLIENT_USER)')
  console.log('   - See service reviews for their 3 locations\n')

  console.log('═══════════════════════════════════════════════════════════\n')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
