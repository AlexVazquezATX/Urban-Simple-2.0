import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get the Payroll Assistant channel
  const payrollChannel = await prisma.channel.findFirst({
    where: {
      slug: 'ai-payroll',
    },
    include: {
      members: true,
    },
  })

  if (!payrollChannel) {
    console.log('❌ Payroll Assistant channel not found')
    return
  }

  console.log('\n📋 Payroll Assistant Channel Members:')
  console.log('======================================')
  console.log(`Channel: ${payrollChannel.name}`)
  console.log(`Members: ${payrollChannel.members.length}`)
  console.log()

  // Get users for all members
  for (const member of payrollChannel.members) {
    const user = await prisma.user.findUnique({
      where: { id: member.userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    })

    if (user) {
      console.log(`${member.userId === payrollChannel.members[0].userId ? '1' : payrollChannel.members.indexOf(member) + 1}. ${user.firstName} ${user.lastName} (${user.email})`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Member Role: ${member.role}`)
      console.log()
    }
  }

  // Check if Alex Vazquez is a member
  const alex = await prisma.user.findFirst({
    where: { email: 'alex@urbansimple.net' },
  })

  if (!alex) {
    console.log('❌ Alex Vazquez user not found')
    return
  }

  const alexMember = payrollChannel.members.find((m) => m.userId === alex.id)
  if (alexMember) {
    console.log('✅ Alex Vazquez IS a member')
  } else {
    console.log('❌ Alex Vazquez is NOT a member - adding now...')

    await prisma.channelMember.create({
      data: {
        channelId: payrollChannel.id,
        userId: alex.id,
        role: 'member',
      },
    })
    console.log('✅ Added Alex Vazquez to Payroll Assistant channel')
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
