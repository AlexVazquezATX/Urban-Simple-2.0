/**
 * Horseshoe Bay Resort — 2026 Pricing Update
 *
 * Run with: npx tsx prisma/update-hsb-pricing.ts
 *
 * Updates all facility rates to correct 2026 pricing,
 * disables seasonal rules, and adds monthly overrides
 * for facilities paused Oct–Dec.
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

config({ path: '.env.local' })

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL,
})

// 2026 correct pricing
const PRICING: Record<string, {
  rate: number
  pausedOctDec: boolean
}> = {
  "J's Restaurant":              { rate: 6086.61, pausedOctDec: false },
  "J's Bar-only":                { rate: 760.83,  pausedOctDec: true },
  "Back Hallway":                { rate: 2600.75, pausedOctDec: false },
  "360 Bar & FOH":               { rate: 978.50,  pausedOctDec: true },
  "360 BOH":                     { rate: 3275.40, pausedOctDec: false },
  "Waterfront BOH":              { rate: 3044.68, pausedOctDec: false },
  "Waterfront FOH (Floors Only)":{ rate: 893.06,  pausedOctDec: false },
  "Yacht Club":                  { rate: 5770.20, pausedOctDec: false },
  "Yacht Club Indoor Bar-only":  { rate: 887.72,  pausedOctDec: true },
  "Yacht Club Pool Bar":         { rate: 1575.90, pausedOctDec: true },
  "Slick Rock":                  { rate: 2294.84, pausedOctDec: false },
  "The Ranch":                   { rate: 1195.00, pausedOctDec: true },
  "Cap Rock":                    { rate: 6244.89, pausedOctDec: false },
  "Cap Rock Indoor + Cabana Bar":{ rate: 220.50,  pausedOctDec: true },
  "Cafeteria (new)":             { rate: 1575.00, pausedOctDec: false },
  "Summit (combined)":           { rate: 7000.00, pausedOctDec: false },
}

async function main() {
  console.log('💰 Horseshoe Bay Resort — 2026 Pricing Update')
  console.log('================================================\n')

  // Find HSB client
  const client = await prisma.client.findFirst({
    where: { name: { contains: 'Horseshoe Bay' } },
    include: {
      facilityProfiles: {
        include: {
          location: { select: { name: true } },
          seasonalRules: true,
        },
      },
    },
  })

  if (!client) {
    console.error('❌ Horseshoe Bay client not found')
    process.exit(1)
  }

  console.log(`📋 Found client: ${client.name} (${client.facilityProfiles.length} facilities)\n`)

  let updated = 0
  let overridesCreated = 0

  for (const fp of client.facilityProfiles) {
    const name = fp.location.name
    const pricing = PRICING[name]

    if (!pricing) {
      console.log(`  ⚠️  ${name} — no pricing found, skipping`)
      continue
    }

    // 1. Update rate + disable seasonal rules
    await prisma.facilityProfile.update({
      where: { id: fp.id },
      data: {
        defaultMonthlyRate: pricing.rate,
        seasonalRulesEnabled: false,
        status: 'ACTIVE', // ensure all are active (Oct-Dec pausing via overrides)
      },
    })

    // 2. Deactivate any existing seasonal rules
    if (fp.seasonalRules.length > 0) {
      await prisma.seasonalRule.updateMany({
        where: { facilityProfileId: fp.id },
        data: { isActive: false },
      })
      console.log(`  🔕 ${name} — deactivated ${fp.seasonalRules.length} seasonal rule(s)`)
    }

    // 3. Add Oct, Nov, Dec 2026 monthly overrides for paused facilities
    if (pricing.pausedOctDec) {
      for (const month of [10, 11, 12]) {
        await prisma.monthlyOverride.upsert({
          where: {
            facilityProfileId_year_month: {
              facilityProfileId: fp.id,
              year: 2026,
              month,
            },
          },
          create: {
            facilityProfileId: fp.id,
            year: 2026,
            month,
            overrideStatus: 'PAUSED',
            overrideNotes: 'Seasonal pause Oct–Dec 2026',
          },
          update: {
            overrideStatus: 'PAUSED',
            overrideNotes: 'Seasonal pause Oct–Dec 2026',
          },
        })
        overridesCreated++
      }
    }

    const oldRate = Number(fp.defaultMonthlyRate)
    const diff = pricing.rate - oldRate
    const diffStr = diff === 0 ? 'no change' : `${diff > 0 ? '+' : ''}$${diff.toFixed(2)}`

    console.log(
      `  ✅ ${name} — $${pricing.rate.toLocaleString()}/mo (${diffStr})${pricing.pausedOctDec ? ' [PAUSED Oct–Dec]' : ''}`
    )
    updated++
  }

  // Verify totals
  const allActive = Object.values(PRICING).reduce((sum, p) => sum + p.rate, 0)
  const yearRoundOnly = Object.values(PRICING)
    .filter(p => !p.pausedOctDec)
    .reduce((sum, p) => sum + p.rate, 0)

  console.log(`\n================================================`)
  console.log(`✅ Updated ${updated} facilities, created ${overridesCreated} monthly overrides`)
  console.log(`💰 Monthly Total (Jan–Sep, all active): $${allActive.toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
  console.log(`💰 Monthly Total (Oct–Dec, year-round only): $${yearRoundOnly.toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
}

main()
  .catch((e) => {
    console.error('❌ Update error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
