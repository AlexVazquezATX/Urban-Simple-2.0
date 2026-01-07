// Quick script to make a user a SUPER_ADMIN
// Run with: npx tsx scripts/make-super-admin.ts <email>

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]

  if (!email) {
    console.error('Usage: npx tsx scripts/make-super-admin.ts <email>')
    console.error('Example: npx tsx scripts/make-super-admin.ts alex@urbansimple.net')
    process.exit(1)
  }

  console.log(`Looking for user with email: ${email}`)

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    console.error(`❌ User not found with email: ${email}`)
    console.log('\nAvailable users:')
    const allUsers = await prisma.user.findMany({
      select: { email: true, role: true, firstName: true, lastName: true },
    })
    allUsers.forEach((u) => {
      console.log(`  - ${u.email} (${u.role}) - ${u.firstName} ${u.lastName}`)
    })
    process.exit(1)
  }

  console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email})`)
  console.log(`Current role: ${user.role}`)

  if (user.role === 'SUPER_ADMIN') {
    console.log('✅ User is already a SUPER_ADMIN')
    process.exit(0)
  }

  // Update to SUPER_ADMIN
  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'SUPER_ADMIN' },
  })

  console.log('✅ Successfully updated user to SUPER_ADMIN')
  console.log('\nYou may need to:')
  console.log('1. Sign out and sign back in')
  console.log('2. Or refresh the page to see the role switcher')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
