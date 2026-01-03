import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check() {
  const clients = await prisma.client.count()
  const invoices = await prisma.invoice.count()
  const payments = await prisma.payment.count()
  const locations = await prisma.location.count()

  console.log('\n📊 Database Records:')
  console.log('  Clients:', clients)
  console.log('  Locations:', locations)
  console.log('  Invoices:', invoices)
  console.log('  Payments:', payments)

  if (clients > 0) {
    const clientList = await prisma.client.findMany({
      select: { name: true }
    })
    console.log('\n👥 Clients:')
    clientList.forEach(c => console.log('  -', c.name))
  }

  await prisma.$disconnect()
}

check()
