import { PrismaClient } from '@prisma/client'
import { AI_PERSONAS } from '../src/lib/ai/prompts'

const prisma = new PrismaClient()

async function main() {
  console.log('\n🔄 Updating AI channel names with personal names...\n')

  // Update Payroll Assistant channel
  const payrollChannel = await prisma.channel.findFirst({
    where: { slug: 'ai-payroll' },
  })

  if (payrollChannel) {
    const personaConfig = AI_PERSONAS.payroll
    await prisma.channel.update({
      where: { id: payrollChannel.id },
      data: {
        name: `${personaConfig.aiName} (${personaConfig.name})`,
        aiSystemPrompt: personaConfig.systemPrompt,
      },
    })
    console.log(`✅ Updated: ${personaConfig.aiName} (${personaConfig.name})`)
  } else {
    console.log('⏭️  No Payroll Assistant channel found')
  }

  console.log('\n✨ All AI channels updated!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
