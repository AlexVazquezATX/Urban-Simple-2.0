import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get all channels
  const channels = await prisma.channel.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      isAiEnabled: true,
      aiPersona: true,
      aiLanguages: true,
      _count: {
        select: { members: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  console.log('\n📋 All Channels:')
  console.log('================')
  channels.forEach((channel, index) => {
    console.log(`${index + 1}. ${channel.name} (${channel.slug})`)
    console.log(`   Type: ${channel.type}`)
    console.log(`   AI Enabled: ${channel.isAiEnabled}`)
    console.log(`   AI Persona: ${channel.aiPersona || 'N/A'}`)
    console.log(`   Members: ${channel._count.members}`)
    console.log()
  })

  // Get AI channels specifically
  const aiChannels = channels.filter((ch) => ch.isAiEnabled)
  console.log(`\n🤖 AI Channels: ${aiChannels.length}`)
  aiChannels.forEach((ch) => {
    console.log(`   - ${ch.name} (persona: ${ch.aiPersona})`)
  })
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
