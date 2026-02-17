/**
 * Horseshoe Bay Resort — Facility Seed Script
 *
 * Run with: npx tsx prisma/seed-horseshoe-bay.ts
 *
 * This script creates (or finds) the Horseshoe Bay client,
 * creates Location records for each facility, and attaches
 * FacilityProfile records with realistic rates and schedules.
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// Load env vars from .env.local
config({ path: '.env.local' })

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL,
})

// HSB facility definitions
const FACILITIES = [
  {
    name: "J's Restaurant",
    category: 'restaurant',
    rate: 6086.61,
    frequency: 5,
    days: [1, 2, 3, 4, 5], // Mon-Fri
    seasonal: false,
    scope: 'Full kitchen deep clean, dining room floors, restrooms',
  },
  {
    name: "J's Bar-only",
    category: 'bar',
    rate: 760.83,
    frequency: 5,
    days: [1, 2, 3, 4, 5],
    seasonal: false, // handled via monthly overrides Oct-Dec
    scope: 'Bar top, behind bar, glassware area, bar floor',
  },
  {
    name: 'Back Hallway',
    category: 'common-area',
    rate: 2600.75,
    frequency: 5,
    days: [1, 2, 3, 4, 5],
    seasonal: false,
    scope: 'Hallway floors, walls, light fixtures',
  },
  {
    name: '360 Bar & FOH',
    category: 'restaurant',
    rate: 978.50,
    frequency: 5,
    days: [1, 2, 3, 4, 5],
    seasonal: false, // handled via monthly overrides Oct-Dec
    scope: 'Front of house dining, bar area, host stand, restrooms',
  },
  {
    name: '360 BOH',
    category: 'kitchen',
    rate: 3275.40,
    frequency: 5,
    days: [1, 2, 3, 4, 5],
    seasonal: false,
    scope: 'Kitchen deep clean, hood vents, prep areas, walk-in',
  },
  {
    name: 'Waterfront BOH',
    category: 'kitchen',
    rate: 3044.68,
    frequency: 5,
    days: [1, 2, 3, 4, 5],
    seasonal: false,
    scope: 'Kitchen deep clean, dish pit, prep stations',
  },
  {
    name: 'Waterfront FOH (Floors Only)',
    category: 'restaurant',
    rate: 893.06,
    frequency: 3,
    days: [1, 3, 5], // Mon, Wed, Fri
    seasonal: false,
    scope: 'Dining area floor scrub and polish only',
  },
  {
    name: 'Yacht Club',
    category: 'restaurant',
    rate: 5770.20,
    frequency: 6,
    days: [1, 2, 3, 4, 5, 6], // Mon-Sat
    seasonal: false,
    scope: 'Full venue clean — dining, bar, kitchen, restrooms, lobby',
  },
  {
    name: 'Yacht Club Indoor Bar-only',
    category: 'bar',
    rate: 887.72,
    frequency: 6,
    days: [1, 2, 3, 4, 5, 6],
    seasonal: false, // handled via monthly overrides Oct-Dec
    scope: 'Indoor bar top, well area, back bar, glassware',
  },
  {
    name: 'Yacht Club Pool Bar',
    category: 'bar',
    rate: 1575.90,
    frequency: 7,
    days: [0, 1, 2, 3, 4, 5, 6], // Every day
    seasonal: false, // handled via monthly overrides Oct-Dec
    scope: 'Pool bar, surrounding deck area, pool restrooms',
  },
  {
    name: 'Slick Rock',
    category: 'restaurant',
    rate: 2294.84,
    frequency: 5,
    days: [1, 2, 3, 4, 5],
    seasonal: false,
    scope: 'Full restaurant clean, patio, restrooms',
  },
  {
    name: 'The Ranch',
    category: 'venue',
    rate: 1195.00,
    frequency: 3,
    days: [1, 3, 5],
    seasonal: false, // handled via monthly overrides Oct-Dec
    scope: 'Event venue, kitchen, restrooms, grounds',
  },
  {
    name: 'Cap Rock',
    category: 'restaurant',
    rate: 6244.89,
    frequency: 5,
    days: [1, 2, 3, 4, 5],
    seasonal: false,
    scope: 'Restaurant kitchen, dining, bar, restrooms',
  },
  {
    name: 'Cap Rock Indoor + Cabana Bar',
    category: 'bar',
    rate: 220.50,
    frequency: 5,
    days: [1, 2, 3, 4, 5],
    seasonal: false, // handled via monthly overrides Oct-Dec
    scope: 'Indoor bar area plus outdoor cabana bar and deck',
  },
  {
    name: 'Cafeteria (new)',
    category: 'cafeteria',
    rate: 1575.00,
    frequency: 5,
    days: [1, 2, 3, 4, 5],
    seasonal: false,
    scope: 'Employee cafeteria — kitchen, serving area, dining, restrooms',
  },
  {
    name: 'Summit (combined)',
    category: 'restaurant',
    rate: 7000.00,
    frequency: 5,
    days: [1, 2, 3, 4, 5],
    seasonal: false,
    scope: 'Combined summit venue — restaurant, bar, event space',
  },
]

async function main() {
  console.log('🏖️  Horseshoe Bay Resort — Facility Seed Script')
  console.log('================================================\n')

  // 1. Find the user's company (use the first one)
  const company = await prisma.company.findFirst({
    include: { branches: true },
  })

  if (!company) {
    console.error('❌ No company found. Please create a company first.')
    process.exit(1)
  }

  const branch = company.branches[0]
  if (!branch) {
    console.error('❌ No branch found. Please create a branch first.')
    process.exit(1)
  }

  console.log(`📍 Company: ${company.name} / Branch: ${branch.name}\n`)

  // 2. Find or create the Horseshoe Bay client
  let client = await prisma.client.findFirst({
    where: {
      companyId: company.id,
      name: { contains: 'Horseshoe Bay' },
    },
  })

  if (!client) {
    client = await prisma.client.create({
      data: {
        companyId: company.id,
        branchId: branch.id,
        name: 'Horseshoe Bay Resort',
        legalName: 'Horseshoe Bay Resort LLC',
        billingEmail: 'accounting@horseshoebayresort.com',
        status: 'active',
        paymentTerms: 'NET_30',
        taxRate: 0.0825, // 8.25% Texas sales tax
        billingDisplayMode: 'PRE_TAX_ONLY',
      },
    })
    console.log(`✅ Created client: ${client.name}`)
  } else {
    console.log(`📋 Found existing client: ${client.name}`)
  }

  // 3. Create locations + facility profiles
  let created = 0
  let skipped = 0

  for (const facility of FACILITIES) {
    // Check if location already exists
    const existing = await prisma.location.findFirst({
      where: {
        clientId: client.id,
        name: facility.name,
      },
      include: { facilityProfile: true },
    })

    if (existing?.facilityProfile) {
      console.log(`  ⏭️  ${facility.name} — already has profile`)
      skipped++
      continue
    }

    // Create location if needed
    let location = existing
    if (!location) {
      location = await prisma.location.create({
        data: {
          clientId: client.id,
          branchId: branch.id,
          name: facility.name,
          address: {
            street: 'Horseshoe Bay Resort',
            city: 'Horseshoe Bay',
            state: 'TX',
            zip: '78657',
          },
          serviceNotes: facility.scope,
          isActive: true,
        },
        include: { facilityProfile: true },
      })
    }

    // Create facility profile
    const profile = await prisma.facilityProfile.create({
      data: {
        clientId: client.id,
        locationId: location.id,
        category: facility.category,
        defaultMonthlyRate: facility.rate,
        rateType: 'FLAT_MONTHLY',
        taxBehavior: 'INHERIT_CLIENT',
        status: 'ACTIVE',
        goLiveDate: new Date('2026-03-01'),
        seasonalRulesEnabled: facility.seasonal,
        normalDaysOfWeek: facility.days,
        normalFrequencyPerWeek: facility.frequency,
        scopeOfWorkNotes: facility.scope,
        sortOrder: created,
      },
    })

    console.log(
      `  ✅ ${facility.name} — $${facility.rate}/mo, ${facility.frequency}x/week${facility.seasonal ? ' (seasonal)' : ''}`
    )
    created++
  }

  console.log(`\n================================================`)
  console.log(`✅ Done! Created ${created} facilities, skipped ${skipped}`)

  const totalMonthly = FACILITIES.reduce((sum, f) => sum + f.rate, 0)
  console.log(`💰 Total monthly (all active): $${totalMonthly.toLocaleString()}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
