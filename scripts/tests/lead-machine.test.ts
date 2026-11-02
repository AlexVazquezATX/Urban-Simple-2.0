import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/lib/db'
import { ProspectIndex, streetKey, displayName } from '../../src/lib/lead-machine/match'
import { classifyByName, EXCLUDE_NAMES } from '../../src/lib/lead-machine/sources/types'
import { pickCompleteMonth } from '../../src/lib/lead-machine/sources/alcohol-sales'
import { fetchTabcCandidates } from '../../src/lib/lead-machine/sources/tabc'
import { fetchPlacesHotelCandidates, parseFormattedAddress } from '../../src/lib/lead-machine/sources/places-hotels'
import { allocate, mergeCandidates, runSourcing } from '../../src/lib/lead-machine/pipeline'
import { findProblems } from '../../src/lib/lead-machine/health'
import { validatePatch } from '../../src/lib/lead-machine/settings'
import type { Candidate } from '../../src/lib/lead-machine/sources/types'

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })

// ---- matching and classification ----

test('streetKey ignores direction words, suites and punctuation', () => {
  assert.equal(streetKey('110 E 2nd St'), '110 2nd')
  assert.equal(streetKey('110 East 2nd Street, Ste 4'), '110 2nd')
  assert.equal(streetKey('No number here'), null)
})

test('ProspectIndex treats same-name businesses at different addresses as separate locations', () => {
  const idx = new ProspectIndex([{ id: 'north', companyName: 'Chuy\'s', street: '10520 N Lamar Blvd' }])
  assert.equal(idx.find('CHUYS', '1728 Barton Springs Rd'), null, 'another chain location')
  assert.equal(idx.find('Chuy\'s', '10520 N Lamar Blvd'), 'north')
  assert.equal(idx.find('Chuy\'s'), 'north', 'no address to compare: name decides')
})

test('ProspectIndex matches on name, or on address plus a shared name word, never address alone', () => {
  const idx = new ProspectIndex([
    { id: 'jw', companyName: 'JW Marriott Austin', street: '110 E 2nd St' },
    { id: 'hyatt', companyName: 'Hyatt Regency Austin', street: '208 Barton Springs Rd' },
  ])
  assert.equal(idx.find('JW MARRIOTT AUSTIN'), 'jw')
  assert.equal(idx.find('Regency Beverage Company', '208 Barton Springs Rd'), 'hyatt')
  assert.equal(idx.find('Corner Restaurant', '110 E 2nd St'), null, 'restaurant inside a hotel is a different buyer')
})

test('hotel names match the CRM without "hotel", "resort", "spa", "downtown"', () => {
  const idx = new ProspectIndex([
    { id: 'fair', companyName: 'Fairmont Austin' },
    { id: 'omni', companyName: 'Omni Barton Creek Resort' },
  ])
  assert.equal(idx.find('Fairmont Austin Hotel'), 'fair')
  assert.equal(idx.find('Omni Barton Creek Resort & Spa'), 'omni')
  assert.equal(idx.find('Hyatt Place Austin Downtown'), null)
})

test('concessionaires and permit-holder names are excluded', () => {
  assert.ok(EXCLUDE_NAMES.test('Levy At Austin Fc'))
  assert.ok(EXCLUDE_NAMES.test('Wls Beverage Company'))
  assert.ok(!EXCLUDE_NAMES.test('Black Sheep Lodge'))
})

test('classifyByName: bar words beat hotel words; resorts are resorts', () => {
  assert.equal(classifyByName('Omni Barton Creek Resort & Spa'), 'resort')
  assert.equal(classifyByName('Fairmont Austin Hotel'), 'hotel')
  assert.equal(classifyByName('The Volstead Lounge/Hotel Vegas'), 'bar')
  assert.equal(classifyByName("The Cedar Door/Foxy's Proper Pub"), 'bar')
  assert.equal(classifyByName('Inn Cahoots'), 'restaurant')
  assert.equal(classifyByName('Hampton Inn & Suites Downtown'), 'hotel')
  assert.equal(classifyByName('Black Sheep Lodge'), 'restaurant', 'Austin lodges are bars and restaurants')
  assert.equal(classifyByName('Matt\'s El Rancho'), 'restaurant')
})

test('displayName fixes ALL CAPS but keeps brand acronyms', () => {
  assert.equal(displayName('JW MARRIOTT AUSTIN'), 'JW Marriott Austin')
  assert.equal(displayName('Already Mixed Case'), 'Already Mixed Case')
})

// ---- sources ----

test('pickCompleteMonth skips the thin, still-filing month', () => {
  assert.equal(pickCompleteMonth([
    { obligation_end_date_yyyymmdd: '2026-10-31T00:00:00.000', count: '2' },
    { obligation_end_date_yyyymmdd: '2026-09-30T00:00:00.000', count: '1409' },
    { obligation_end_date_yyyymmdd: '2026-08-31T00:00:00.000', count: '1467' },
  ]), '2026-09-30T00:00:00.000')
})

test('TABC: one business per primary license, every filing kept as a signal, excluded names dropped', async () => {
  const rows = [
    { application_id: '1', license_type: 'MB', primary_license_id: 'P1', trade_name: 'Sakura Sushi and Bar', owner: 'Sakura-Texas LLC', address: '12680 US-290', city: 'Austin', zip: '78737', submission_date: '2026-10-26T00:00:00.000' },
    { application_id: '2', license_type: 'FB', primary_license_id: 'P1', trade_name: 'Sakura Sushi and Bar', owner: 'Sakura-Texas LLC', address: '12680 US-290', city: 'Austin', zip: '78737', submission_date: '2026-10-26T00:00:00.000' },
    { application_id: '3', license_type: 'MB', primary_license_id: 'P2', trade_name: 'St. Paul Catholic Church', owner: 'Church', city: 'Austin' },
  ]
  let url = ''
  const { candidates } = await fetchTabcCandidates({ fetchImpl: async (u) => { url = u; return json(rows) }, now: new Date('2026-10-27') })
  assert.match(decodeURIComponent(url), /license_type in \('MB','BG','FB','BE'\)/)
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].name, 'Sakura Sushi and Bar')
  assert.equal(candidates[0].segment, 'bar')
  assert.deepEqual(candidates[0].signals.map((s) => s.sourceKey), ['tabc:1', 'tabc:2'])
})

test('Places: filters small/economy/closed listings, counts calls, retries a warming page token once', async () => {
  const calls: string[] = []
  const responses = [
    { status: 'OK', next_page_token: 'T1', results: [
      { place_id: 'a', name: 'Fairmont Austin', formatted_address: '101 Red River St, Austin, TX 78701, United States', user_ratings_total: 9000, rating: 4.6, business_status: 'OPERATIONAL' },
      { place_id: 'b', name: 'Motel 6 Austin', formatted_address: '1 Main St, Austin, TX 78701, United States', user_ratings_total: 900, rating: 3.1 },
      { place_id: 'c', name: 'Tiny Inn', user_ratings_total: 20 },
      { place_id: 'e', name: 'JW Marriott San Antonio Hill Country Resort & Spa', formatted_address: '23808 Resort Pkwy, San Antonio, TX 78261, United States', user_ratings_total: 8000 },
    ] },
    { status: 'INVALID_REQUEST' },
    { status: 'OK', results: [{ place_id: 'd', name: 'Lake Austin Spa Resort', formatted_address: '1705 S Quinlan Park Rd, Austin, TX 78732, United States', user_ratings_total: 1200 }] },
  ]
  const { candidates, stats } = await fetchPlacesHotelCandidates({
    apiKey: 'k',
    callBudget: 3,
    pageDelayMs: 0,
    fetchImpl: async (u) => { calls.push(u); return json(responses.shift() ?? { status: 'ZERO_RESULTS' }) },
  })
  assert.equal(stats.placesCalls, 3, 'budget respected, retry counted')
  assert.deepEqual(candidates.map((c) => [c.name, c.segment]), [['Fairmont Austin', 'hotel'], ['Lake Austin Spa Resort', 'resort']])
  assert.deepEqual(parseFormattedAddress('101 Red River St, Austin, TX 78701, United States'), { street: '101 Red River St', city: 'Austin', state: 'TX', zip: '78701' })
})

// ---- merge and caps ----

const cand = (over: Partial<Candidate>): Candidate => ({
  source: 'alcohol_sales', name: 'X', segment: 'restaurant', address: {}, priority: 2, reason: 'r', signals: [], ...over,
})

test('mergeCandidates keeps Google\'s name and every signal', () => {
  const merged = mergeCandidates([
    cand({ name: 'Regency Beverage Company', address: { street: '208 Barton Springs Rd' }, signals: [{ kind: 'alcohol_sales', sourceKey: 'mixbev:1:2026-09', observedAt: new Date(), data: {} }] }),
    cand({ source: 'places_hotels', name: 'Hyatt Regency Austin', segment: 'hotel', priority: 3.5, address: { street: '208 Barton Springs Rd' }, signals: [{ kind: 'google_places', sourceKey: 'places:p', observedAt: new Date(), data: {} }] }),
  ])
  assert.equal(merged.length, 1)
  assert.equal(merged[0].name, 'Hyatt Regency Austin')
  assert.equal(merged[0].segment, 'hotel')
  assert.equal(merged[0].signals.length, 2)
})

test('allocate respects per-source and total caps, highest priority first', () => {
  const fresh = mergeCandidates([
    cand({ name: 'A', source: 'tabc', priority: 2.9 }),
    cand({ name: 'B', source: 'tabc', priority: 2.8 }),
    cand({ name: 'C', source: 'places_hotels', priority: 3.9 }),
    cand({ name: 'D', source: 'alcohol_sales', priority: 2.1 }),
  ])
  const { picked, overCap } = allocate(fresh, { tabc: 1, places_hotels: 5, alcohol_sales: 5 }, 2)
  assert.deepEqual(picked.map((p) => p.name), ['C', 'A'])
  assert.equal(overCap, 2)
})

// ---- the nightly run against a fake CRM ----

const db = prisma as any
let created: any[] = []
let signalWrites: any[] = []
let runRows: any[] = []
let settingsRow: any = null

db.leadMachineSettings.findUnique = async () => settingsRow
db.leadMachineRun.create = async ({ data }: any) => { const r = { id: `run${runRows.length}`, ...data }; runRows.push(r); return r }
db.leadMachineRun.update = async ({ where, data }: any) => Object.assign(runRows.find((r) => r.id === where.id), data)
db.leadMachineRun.findFirst = async () => null
db.leadMachineRun.findMany = async () => []
db.prospect.findMany = async () => [{ id: 'existing-jw', companyName: 'JW Marriott Austin', address: { street: '110 E 2nd St' } }]
db.prospect.count = async () => 0
db.prospect.create = async ({ data }: any) => { created.push(data); return { id: `new${created.length}` } }
db.branch.findFirst = async () => ({ id: 'aus', timezone: 'America/Chicago' })
db.prospectSignal.createMany = async ({ data }: any) => { signalWrites.push(...data); return { count: data.length } }
let clients: any[] = []
let knownSignals: any[] = []
db.client.findMany = async () => clients
db.prospectSignal.findMany = async ({ where }: any) => knownSignals.filter((k) => where.sourceKey.in.includes(k.sourceKey))

beforeEach(() => { created = []; signalWrites = []; runRows = []; settingsRow = null; clients = []; knownSignals = [] })

// Fake public data: one license filing, two big alcohol accounts (one already in CRM).
const fakeFetch = async (u: string) => {
  if (u.includes('mxm5-tdpj')) return json([{ application_id: '9', license_type: 'MB', primary_license_id: 'P9', trade_name: 'Tema', owner: 'Tema LLC', address: '314 Congress Ave', city: 'Austin', zip: '78701', submission_date: '2026-10-22T00:00:00.000' }])
  if (u.includes('naix-2893') && u.includes('count')) return json([{ obligation_end_date_yyyymmdd: '2026-09-30T00:00:00.000', count: '1400' }])
  if (u.includes('naix-2893')) return json([
    { location_name: 'JW MARRIOTT AUSTIN', location_address: '110 E 2ND ST', location_city: 'AUSTIN', tabc_permit_number: 'MB1', obligation_end_date_yyyymmdd: '2026-09-30T00:00:00.000', total_receipts: '1550695' },
    { location_name: 'PROPER HOTEL', location_address: '600 W 2ND ST', location_city: 'AUSTIN', tabc_permit_number: 'MB2', obligation_end_date_yyyymmdd: '2026-09-30T00:00:00.000', total_receipts: '922414' },
  ])
  throw new Error(`unexpected fetch ${u}`)
}

test('dry run reports what it would add and writes no prospects or signals', async () => {
  settingsRow = { enabled: true, dryRun: true, dailyNewCap: 25, sourceCaps: { places_hotels: 0 }, placesMonthlyCallCap: 300, briefEnabled: true, notifyEmail: null }
  const r = await runSourcing('co', { fetchImpl: fakeFetch })
  assert.ok(r)
  assert.equal(r.dryRun, true)
  assert.equal(r.matchedExisting, 1)
  assert.deepEqual(r.createdNames.sort(), ['Proper Hotel (hotel)', 'Tema (restaurant)'])
  assert.equal(created.length, 0)
  assert.equal(signalWrites.length, 0)
  assert.ok(runRows.every((x) => x.dryRun === true && x.status !== 'running'))
  assert.equal(runRows.find((x) => x.stage === 'sourcing').stats.wouldCreate, 2)
})

test('live run adds new accounts to the holding area and attaches signals to the existing one', async () => {
  settingsRow = { enabled: true, dryRun: false, dailyNewCap: 25, sourceCaps: { places_hotels: 0 }, placesMonthlyCallCap: 300, briefEnabled: true, notifyEmail: null }
  const r = await runSourcing('co', { fetchImpl: fakeFetch })
  assert.equal(r!.created, 2)
  assert.ok(created.every((p) => p.status === 'prospect' && p.source === 'lead_machine' && p.tags.includes('lead-machine')))
  assert.equal(created.find((p) => p.companyName === 'Proper Hotel').priority, 'high')
  assert.ok(signalWrites.some((s) => s.prospectId === 'existing-jw' && s.sourceKey === 'mixbev:MB1:2026-09'))
  assert.ok(signalWrites.some((s) => s.sourceKey === 'tabc:9'))
})

const liveSettings = () => ({ enabled: true, dryRun: false, dailyNewCap: 25, sourceCaps: { places_hotels: 0 }, placesMonthlyCallCap: 300 })

test('current clients and their locations are never added as prospects', async () => {
  settingsRow = liveSettings()
  clients = [{ id: 'c1', name: 'Kimber Modern Group', legalName: null, address: null, locations: [{ name: 'Proper Hotel', address: { street: '600 W 2nd St' } }] }]
  const r = await runSourcing('co', { fetchImpl: fakeFetch })
  assert.deepEqual(created.map((p) => p.companyName), ['Tema'])
  assert.equal(runRows.find((x) => x.stage === 'sourcing').stats.clientsSkipped, 1)
  assert.equal(r!.created, 1)
})

test('a business whose prospect was deleted or renamed is not re-added', async () => {
  settingsRow = liveSettings()
  knownSignals = [
    { sourceKey: 'tabc:9', prospectId: null }, // Tema was added, then deleted
    { sourceKey: 'seen:proper|600 2nd', prospectId: 'renamed-prospect' }, // renamed in the CRM
  ]
  const r = await runSourcing('co', { fetchImpl: fakeFetch })
  assert.equal(r!.created, 0)
  assert.equal(runRows.find((x) => x.stage === 'sourcing').stats.previouslyRemoved, 1)
  assert.ok(signalWrites.some((s) => s.prospectId === 'renamed-prospect' && s.sourceKey === 'mixbev:MB2:2026-09'))
})

test('every new prospect gets a permanent seen marker', async () => {
  settingsRow = liveSettings()
  await runSourcing('co', { fetchImpl: fakeFetch })
  const markers = signalWrites.filter((s) => s.kind === 'machine_seen').map((s) => s.sourceKey).sort()
  assert.deepEqual(markers, ['seen:proper|600 2nd', 'seen:tema|314 congress'])
})

test('a failed Google run still reports the calls it spent', async () => {
  const responses = [{ status: 'OK', results: [], next_page_token: undefined }, { status: 'OVER_QUERY_LIMIT' }]
  await assert.rejects(
    fetchPlacesHotelCandidates({ apiKey: 'k', callBudget: 10, pageDelayMs: 0, fetchImpl: async () => json(responses.shift()) }),
    (err: any) => err.stats?.placesCalls === 2 && /OVER_QUERY_LIMIT/.test(err.message),
  )
})

test('a failing source is logged and the rest of the run continues', async () => {
  settingsRow = { enabled: true, dryRun: true, dailyNewCap: 25, sourceCaps: { places_hotels: 0 }, placesMonthlyCallCap: 300 }
  const r = await runSourcing('co', { fetchImpl: async (u) => (u.includes('mxm5-tdpj') ? new Response('nope', { status: 503 }) : fakeFetch(u)) })
  assert.ok(r)
  assert.equal(runRows.find((x) => x.stage === 'tabc').status, 'failed')
  assert.equal(runRows.find((x) => x.stage === 'sourcing').status, 'succeeded')
})

// ---- health and settings ----

test('health: failures, a missed night, and three empty live nights are problems; dry run and off are quiet', () => {
  const now = new Date('2026-10-28T08:00:00Z')
  const at = (h: number) => new Date(now.getTime() - h * 3600_000)
  const ok = (h: number, created = 3) => ({ stage: 'sourcing', status: 'succeeded', startedAt: at(h), error: null, stats: { created } })
  const prep = { stage: 'prep', status: 'succeeded', startedAt: at(23), error: null, stats: { accounts: 3 } }
  assert.deepEqual(findProblems({ enabled: false, dryRun: false, runs: [], now }), [])
  assert.deepEqual(findProblems({ enabled: true, dryRun: false, runs: [ok(1)], now }), [])
  assert.match(findProblems({ enabled: true, dryRun: false, runs: [ok(30)], now })[0], /No successful nightly run/)
  assert.match(findProblems({ enabled: true, dryRun: false, runs: [ok(1), { stage: 'tabc', status: 'failed', startedAt: at(1), error: 'HTTP 503', stats: null }], now })[0], /tabc failed: HTTP 503/)
  assert.deepEqual(findProblems({ enabled: true, dryRun: false, runs: [ok(1, 0), prep, ok(25, 0), ok(49, 0)], now }), ['Three nights in a row added no new accounts'])
  assert.deepEqual(findProblems({ enabled: true, dryRun: true, runs: [ok(1, 0), ok(25, 0), ok(49, 0)], now }), [])
  assert.deepEqual(findProblems({ enabled: true, dryRun: false, runs: [{ ...ok(1, 0), dryRun: true }, { ...ok(2, 0), dryRun: true }, prep, ok(25, 0)], now }), [], "manual dry runs while live do not count")
})

test('health: account research that stops, pauses or runs out of Findymail is a problem once the machine is live', () => {
  const now = new Date('2026-10-28T08:00:00Z')
  const at = (h: number) => new Date(now.getTime() - h * 3600_000)
  const ok = (h: number) => ({ stage: 'sourcing', status: 'succeeded', startedAt: at(h), error: null, stats: { created: 3 } })
  const prep = (stats: Record<string, unknown>, status = 'succeeded') => ({ stage: 'prep', status, startedAt: at(23), error: null, stats })
  assert.deepEqual(findProblems({ enabled: true, dryRun: false, runs: [ok(1)], now }), [], 'first live night: no prep expected yet')
  assert.deepEqual(findProblems({ enabled: true, dryRun: false, runs: [ok(1), ok(25)], now }), ['Account research did not run in the last 26 hours'])
  assert.deepEqual(
    findProblems({ enabled: true, dryRun: false, runs: [ok(1), prep({ reason: 'ANTHROPIC_API_KEY is not set' }, 'skipped'), ok(25)], now }),
    ['Account research is paused: ANTHROPIC_API_KEY is not set'],
  )
  assert.deepEqual(
    findProblems({ enabled: true, dryRun: false, runs: [ok(1), prep({ findymailStopped: 'Findymail is out of credits (402)' }), ok(25)], now }),
    ['Contact finding stopped: Findymail is out of credits (402)'],
  )
  assert.deepEqual(findProblems({ enabled: true, dryRun: true, runs: [ok(1), ok(25)], now }), [], 'dry run never preps')
})

test('settings patches are validated', () => {
  assert.deepEqual(validatePatch({ enabled: true, dailyNewCap: 30 }), { patch: { enabled: true, dailyNewCap: 30 } })
  assert.ok('error' in validatePatch({ dailyNewCap: -1 }))
  assert.ok('error' in validatePatch({ sourceCaps: { yelp: 3 } }))
  assert.ok('error' in validatePatch({}))
  assert.deepEqual(validatePatch({ prepDailyCap: 12, findymailMonthlyCap: 800 }), { patch: { prepDailyCap: 12, findymailMonthlyCap: 800 } })
  assert.ok('error' in validatePatch({ prepDailyCap: 51 }))
  assert.ok('error' in validatePatch({ findymailMonthlyCap: 1.5 }))
})
