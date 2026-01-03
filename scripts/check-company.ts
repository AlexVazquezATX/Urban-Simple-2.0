import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const companies = await prisma.company.findMany({
    include: {
      branches: true,
    },
  })

  console.log('Companies:')
  companies.forEach(c => {
    console.log(`  - ${c.name} (${c.id})`)
    c.branches.forEach(b => {
      console.log(`    • Branch: ${b.name} (${b.code})`)
    })
  })

  await prisma.$disconnect()
}

main()
