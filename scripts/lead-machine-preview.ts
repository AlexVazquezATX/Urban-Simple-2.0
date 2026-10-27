// Preview what the lead machine's sources find right now, without touching
// the database. Google Places is capped at 4 calls here.
//   npx tsx scripts/lead-machine-preview.ts
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { fetchTabcCandidates } from '../src/lib/lead-machine/sources/tabc'
import { fetchAlcoholSalesCandidates } from '../src/lib/lead-machine/sources/alcohol-sales'
import { fetchPlacesHotelCandidates } from '../src/lib/lead-machine/sources/places-hotels'
import { mergeCandidates, allocate } from '../src/lib/lead-machine/pipeline'
import { DEFAULT_SOURCE_CAPS } from '../src/lib/lead-machine/settings'

async function main() {
  const tabc = await fetchTabcCandidates({})
  const sales = await fetchAlcoholSalesCandidates({})
  const places = await fetchPlacesHotelCandidates({ apiKey: process.env.GOOGLE_PLACES_API_KEY, callBudget: Number(process.env.PLACES_BUDGET ?? 4) })
  console.log('tabc', tabc.stats, '\nsales', sales.stats, '\nplaces', places.stats)
  const merged = mergeCandidates([...tabc.candidates, ...sales.candidates, ...places.candidates])
  const multi = merged.filter((m) => m.sources.length > 1)
  console.log(`merged ${merged.length}, found by 2+ sources: ${multi.length}`, multi.slice(0, 5).map((m) => `${m.name} [${m.sources}]`))
  const segs: Record<string, number> = {}
  for (const m of merged) segs[m.segment] = (segs[m.segment] ?? 0) + 1
  console.log('segments', segs)
  const { picked } = allocate(merged, DEFAULT_SOURCE_CAPS, 25)
  console.log('\nTop 25 the machine would add if the CRM were empty:')
  for (const m of picked) console.log(`- [${m.source}] ${m.name} (${m.segment}) ${m.address.street ?? ''} :: ${m.reasons[0]}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
