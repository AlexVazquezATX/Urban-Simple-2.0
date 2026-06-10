/** One-off: list active portal clients for QBO matching. */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const clients = await prisma.client.findMany({
    where: { status: 'active', deletedAt: null },
    select: { id: true, name: true, legalName: true, billingEmail: true, parentClientId: true },
    orderBy: { name: 'asc' },
  })
  console.log(JSON.stringify(clients, null, 1))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
