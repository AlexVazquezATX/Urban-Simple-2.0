/**
 * Add Service Agreements to Demo Data
 *
 * Creates service agreements for existing clients/locations
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n🌱 Seeding service agreements...')

  // Get the first company and branch
  const company = await prisma.company.findFirst({
    include: { branches: true },
  })

  if (!company || company.branches.length === 0) {
    console.error('❌ No company/branch found. Run db:seed first.')
    return
  }

  const branch = company.branches[0]

  // Get all clients with their locations
  const clients = await prisma.client.findMany({
    where: { companyId: company.id },
    include: {
      locations: {
        where: { isActive: true },
      },
    },
  })

  console.log(`Found ${clients.length} clients\n`)

  const serviceDescriptions = [
    'Nightly Cleaning Service',
    'Weekly Deep Clean',
    'Bi-Weekly Maintenance',
    'Monthly Porter Service',
    'Daily Janitorial Service',
  ]

  const billingDays = [1, 5, 10, 15, 20, 25] // Various billing days throughout the month
  let agreementCount = 0

  for (const client of clients) {
    for (const location of client.locations) {
      // Check if agreement already exists
      const existing = await prisma.serviceAgreement.findFirst({
        where: {
          clientId: client.id,
          locationId: location.id,
        },
      })

      if (existing) {
        console.log(`  ⏭️  Agreement already exists for ${client.name} - ${location.name}`)
        continue
      }

      // Create a service agreement for each location
      const monthlyAmount = 800 + Math.floor(Math.random() * 2200) // $800-$3000/month
      const billingDay = billingDays[Math.floor(Math.random() * billingDays.length)]
      const description = serviceDescriptions[Math.floor(Math.random() * serviceDescriptions.length)]

      // Start date is 3 months ago
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 3)
      startDate.setDate(1)

      await prisma.serviceAgreement.create({
        data: {
          clientId: client.id,
          locationId: location.id,
          description,
          monthlyAmount,
          billingDay,
          paymentTerms: client.paymentTerms,
          startDate,
          isActive: true,
        },
      })

      console.log(`  ✅ ${client.name} - ${location.name}`)
      console.log(`     💰 $${monthlyAmount}/month | Billing Day: ${billingDay} | ${description}`)
      agreementCount++
    }
  }

  console.log(`\n✨ Created ${agreementCount} service agreements!`)

  // Show summary by billing day
  const agreementsByDay = await prisma.serviceAgreement.groupBy({
    by: ['billingDay'],
    where: {
      isActive: true,
      location: {
        client: {
          companyId: company.id,
        },
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      billingDay: 'asc',
    },
  })

  console.log('\n📊 Agreements by Billing Day:')
  agreementsByDay.forEach((group) => {
    console.log(`   Day ${group.billingDay}: ${group._count.id} agreement(s)`)
  })

  const totalMonthly = await prisma.serviceAgreement.aggregate({
    where: {
      isActive: true,
      location: {
        client: {
          companyId: company.id,
        },
      },
    },
    _sum: {
      monthlyAmount: true,
    },
  })

  console.log(`\n💰 Total Monthly Recurring Revenue: $${Number(totalMonthly._sum.monthlyAmount || 0).toFixed(2)}`)
  console.log(`💰 Annual Recurring Revenue: $${(Number(totalMonthly._sum.monthlyAmount || 0) * 12).toFixed(2)}\n`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
