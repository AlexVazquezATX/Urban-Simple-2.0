import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  })

  console.log('\n📋 Current Users:')
  console.log('================')
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`)
    console.log(`   Role: ${user.role}`)
    console.log(`   ID: ${user.id}\n`)
  })

  // Update the first user to ADMIN
  if (users.length > 0) {
    const firstUser = users[0]
    console.log(`\n🔄 Updating ${firstUser.firstName} ${firstUser.lastName} to ADMIN role...`)

    const updated = await prisma.user.update({
      where: { id: firstUser.id },
      data: { role: 'ADMIN' },
    })

    console.log(`✅ Successfully updated ${updated.firstName} ${updated.lastName} to ADMIN\n`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
