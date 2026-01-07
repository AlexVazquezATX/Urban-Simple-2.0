// Clean up duplicate test locations
// Run with: npx tsx scripts/cleanup-duplicate-locations.ts

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Cleaning up duplicate test locations...\n')

  // Find the test client
  const testClient = await prisma.client.findFirst({
    where: { name: 'Test Client Company' },
  })

  if (!testClient) {
    console.log('No test client found. Nothing to clean up.')
    return
  }

  // Get all locations for this client
  const allLocations = await prisma.location.findMany({
    where: { clientId: testClient.id },
    orderBy: { createdAt: 'asc' }, // Keep oldest ones
  })

  console.log(`Found ${allLocations.length} locations for Test Client Company`)

  // Group by name
  const locationsByName = allLocations.reduce((acc, loc) => {
    if (!acc[loc.name]) {
      acc[loc.name] = []
    }
    acc[loc.name].push(loc)
    return acc
  }, {} as Record<string, typeof allLocations>)

  let deletedCount = 0

  // For each group, keep the first one and delete the rest
  for (const [name, locs] of Object.entries(locationsByName)) {
    if (locs.length > 1) {
      console.log(`\n${name}: Found ${locs.length} duplicates`)
      console.log(`  Keeping: ${locs[0].id} (created ${locs[0].createdAt})`)

      // Delete duplicates
      const toDelete = locs.slice(1)
      for (const loc of toDelete) {
        await prisma.location.delete({
          where: { id: loc.id },
        })
        console.log(`  ❌ Deleted duplicate: ${loc.id}`)
        deletedCount++
      }
    } else {
      console.log(`${name}: No duplicates`)
    }
  }

  console.log(`\n✨ Cleanup complete! Deleted ${deletedCount} duplicate locations.`)
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
