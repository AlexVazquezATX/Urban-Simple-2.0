import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateDraft } from '../../src/lib/lead-machine/prep/copy'
import { bestSiteEmail, findContacts, splitName } from '../../src/lib/lead-machine/prep/contacts'
import { Findymail, FindymailStopped } from '../../src/lib/lead-machine/prep/findymail'
import { extractEmails, htmlToText, ownDomain } from '../../src/lib/lead-machine/prep/site'
import { samePlace } from '../../src/lib/lead-machine/prep/places-lookup'
import { buildMaterial } from '../../src/lib/lead-machine/prep/run'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// ---- copy rules ----

const good = {
  subject: 'nightly crew for tema',
  body: [
    'Hi Maria,',
    '',
    'Saw Tema filed for its mixed beverage permit on Congress last week, so opening must be close. The first months are when closing routines get set, and kitchen teams are already stretched.',
    '',
    'We clean hospitality spaces nightly after close. You would see every clean in your portal and rate it from your phone, instead of wondering what happened overnight. The first deep clean of every location is free with a 3-month agreement.',
    '',
    'Want me to walk the space with you before you open?',
  ].join('\n'),
}

test('validateDraft passes a plain, specific, rule-abiding email', () => {
  assert.deepEqual(validateDraft(good, { firstName: 'Maria' }), [])
})

test('validateDraft rejects dashes, brackets, links, sign-offs, call asks and cliches', () => {
  const bad = (body: string, subject = good.subject) => validateDraft({ subject, body }, { firstName: 'Maria' })
  assert.ok(bad(good.body.replace('close. The', 'close — the')).some((p) => /dash/.test(p)))
  assert.ok(bad(good.body.replace('Hi Maria,', 'Hi [first name],')).some((p) => /bracket/.test(p)))
  assert.ok(bad(`${good.body}\n\nSee urbansimple.net`).some((p) => /link/.test(p)))
  assert.ok(bad(`${good.body}\n\nBest,\nAlex`).some((p) => /sign-off/.test(p)))
  assert.ok(bad(good.body.replace('Want me to walk', 'Can we get on a quick call to walk')).some((p) => /call/.test(p)))
  assert.ok(bad(good.body.replace('Saw Tema', 'I hope this finds you well. Saw Tema')).some((p) => /hope this/.test(p)))
  assert.ok(bad(good.body.replace('stretched.', 'stretched. Passing inspection matters.')).some((p) => /inspection/i.test(p)))
  assert.ok(bad(good.body, 'quick note about your amazing new restaurant opening').some((p) => /subject has/.test(p)))
})

test('validateDraft catches meeting asks, soft sign-offs and hyphen dashes, but allows Dirty Sixth and the business name', () => {
  const check = (body: string, businessName?: string) => validateDraft({ subject: good.subject, body }, { firstName: 'Maria', businessName })
  assert.ok(check(good.body.replace('Want me to walk the space with you before you open?', 'Open to meeting next week?')).some((p) => /meeting/.test(p)))
  assert.ok(check(`${good.body}\n\nKind regards,`).some((p) => /sign-off/.test(p)))
  assert.ok(check(good.body.replace('close. The', 'close - the')).some((p) => /hyphen/.test(p)))
  assert.ok(check(good.body.replace('stretched.', 'stretched, and the health inspector is coming.')).some((p) => /inspect/.test(p)))
  assert.deepEqual(check(good.body.replace('on Congress', 'on Dirty Sixth')), [])
  assert.deepEqual(check(good.body.replace('Saw Tema', "Saw Dirty Bill's"), "Dirty Bill's"), [])
})

test('validateDraft enforces the greeting: the first name when known, plain "Hi," otherwise', () => {
  assert.ok(validateDraft(good, { firstName: null }).some((p) => /"Hi,"/.test(p)))
  assert.deepEqual(validateDraft({ ...good, body: good.body.replace('Hi Maria,', 'Hi,') }, { firstName: null }), [])
})

// ---- website and contacts ----

test('ownDomain keeps the business domain and drops listing, booking and chain sites', () => {
  assert.equal(ownDomain('https://www.temaatx.com/menu'), 'temaatx.com')
  assert.equal(ownDomain('https://www.instagram.com/tema'), null)
  assert.equal(ownDomain('https://www.marriott.com/en-us/hotels/ausjw'), null)
  assert.equal(ownDomain('https://tema.square.site'), null)
  assert.equal(ownDomain(null), null)
})

test('extractEmails keeps own-domain and mailto free-mail addresses, drops junk', () => {
  const html = `<a href="mailto:Hello@TemaATX.com">x</a> owner@temaatx.com logo@2x.png
    <a href="mailto:maria.tema@gmail.com">Maria</a> random@gmail.com someone@other.com info@example.com`
  assert.deepEqual(extractEmails(html, 'temaatx.com').sort(), ['hello@temaatx.com', 'maria.tema@gmail.com', 'owner@temaatx.com'])
})

test('htmlToText drops scripts and tags', () => {
  assert.equal(htmlToText('<script>x()</script><h1>Our story</h1><p>Founded by Maria &amp; Jo</p>'), 'Our story\nFounded by Maria & Jo')
})

test('bestSiteEmail prefers a personal address, then the inbox most likely to reach the owner', () => {
  assert.equal(bestSiteEmail(['events@t.com', 'maria@t.com', 'info@t.com']), 'maria@t.com')
  assert.equal(bestSiteEmail(['events@t.com', 'info@t.com', 'gm@t.com']), 'gm@t.com')
  assert.equal(bestSiteEmail(['careers@t.com', 'reservations@t.com']), null)
})

test('splitName handles middle names', () => {
  assert.deepEqual(splitName(' Maria  de la Cruz '), { firstName: 'Maria', lastName: 'de la Cruz' })
})

test('samePlace accepts a shared name word or the same street, never a stranger', () => {
  assert.ok(samePlace({ name: 'Maiko Japanese Restaurant', street: '311 W 6th St' }, { name: 'Maiko Sushi Lounge', address: '207 San Jacinto Blvd, Austin, TX 78701, USA' }))
  assert.ok(samePlace({ name: 'Regency Beverage Company', street: '208 Barton Springs Rd' }, { name: 'Hyatt Regency Austin', address: '208 Barton Springs Rd, Austin, TX 78704, USA' }))
  assert.ok(!samePlace({ name: 'Tema', street: '314 Congress Ave' }, { name: 'Starbucks', address: '500 Congress Ave, Austin, TX 78701, USA' }))
  assert.ok(!samePlace({ name: "Joe's Bar" }, { name: 'Black Cat Bar', address: '309 E 6th St, Austin, TX 78701, USA' }), 'category word alone')
  assert.ok(!samePlace({ name: 'Taco Joint' }, { name: 'Taco Bell', address: '1 Main St, Austin, TX 78701, USA' }))
  assert.ok(!samePlace({ name: 'The Bar' }, { name: 'The Bar', address: '1 Main St, Austin, TX 78701, USA' }), 'nothing distinctive needs the street')
})

function fakeFindymail(routes: Record<string, (body: any) => Response>, remaining = 10) {
  const calls: string[] = []
  const fm = new Findymail('key', { remaining }, async (url, init) => {
    const path = new URL(url).pathname
    calls.push(path)
    const handler = routes[path]
    if (!handler) throw new Error(`unexpected ${path}`)
    return handler(init?.body ? JSON.parse(String(init.body)) : null)
  })
  return { fm, calls }
}

test('findContacts: the named decision maker costs one lookup', async () => {
  const { fm, calls } = fakeFindymail({ '/api/search/name': (b) => json({ contact: { email: `${b.name.split(' ')[0].toLowerCase()}@temaatx.com` } }) })
  const found = await findContacts({ segment: 'restaurant', domain: 'temaatx.com', decisionMaker: { name: 'Maria Lopez', title: 'Owner' }, siteEmails: ['info@temaatx.com'], findymail: fm })
  assert.equal(found.length, 1)
  assert.equal(found[0].email, 'maria@temaatx.com')
  assert.equal(found[0].emailVerificationStatus, 'valid')
  assert.equal(found[0].isDecisionMaker, true)
  assert.deepEqual(calls, ['/api/search/name'])
  assert.deepEqual(fm.usage, { finds: 1, verifies: 0, employeeLookups: 0 })
})

test('findContacts: no name falls back to the right title, then to a verified site inbox', async () => {
  const withEmployee = fakeFindymail({
    '/api/search/employees': () => json([{ name: 'Jo Park', jobTitle: 'General Manager', linkedinUrl: 'https://linkedin.com/in/jopark' }]),
    '/api/search/name': () => json({ contact: { email: 'jo@temaatx.com' } }),
  })
  const a = await findContacts({ segment: 'restaurant', domain: 'temaatx.com', decisionMaker: null, siteEmails: [], findymail: withEmployee.fm })
  assert.equal(a[0].email, 'jo@temaatx.com')
  assert.equal(a[0].title, 'General Manager')
  assert.equal(a[0].linkedinUrl, 'https://linkedin.com/in/jopark')

  const nobody = fakeFindymail({
    '/api/search/employees': () => json([]),
    '/api/verify': () => json({ verified: false }),
  })
  const b = await findContacts({ segment: 'bar', domain: 'temaatx.com', decisionMaker: null, siteEmails: ['events@temaatx.com', 'info@temaatx.com'], findymail: nobody.fm })
  assert.equal(b[0].email, 'info@temaatx.com')
  assert.equal(b[0].emailVerificationStatus, 'risky', 'unconfirmed address is held by the send gate')
  assert.equal(b[0].isDecisionMaker, false)
  assert.deepEqual(nobody.fm.usage, { finds: 0, verifies: 1, employeeLookups: 0 })
})

test('findContacts without Findymail still offers the site inbox, unverified', async () => {
  const found = await findContacts({ segment: 'bar', domain: 'x.com', decisionMaker: null, siteEmails: ['hello@x.com'], findymail: null })
  assert.equal(found[0].emailVerificationStatus, 'unknown')
})

test('Findymail: misses are free, the budget is respected, and a 402 stops the run', async () => {
  const { fm } = fakeFindymail({ '/api/search/name': () => json({ contact: null }) }, 1)
  assert.equal(await fm.findByName('A B', 'x.com'), null)
  assert.equal(fm.remaining, 1, 'a miss gives the credit back')
  const capped = fakeFindymail({ '/api/verify': () => json({ verified: true }) }, 0)
  assert.equal(await capped.fm.verify('a@x.com'), null)
  assert.deepEqual(capped.calls, [], 'no budget, no call')
  const broke = fakeFindymail({ '/api/search/name': () => json({ error: 'no credits' }, 402) })
  await assert.rejects(broke.fm.findByName('A B', 'x.com'), FindymailStopped)
})

test('buildMaterial lists public records, the Google listing and the website text', () => {
  const text = buildMaterial(
    { companyName: 'Tema', legalName: 'Tema LLC', address: { street: '314 Congress Ave', city: 'Austin' }, notes: null },
    'restaurant',
    ['Texas liquor license application (MB) filed 2026-10-22'],
    { placeId: 'p', name: 'Tema', address: '314 Congress Ave', website: 'https://temaatx.com', phone: null, status: 'OPERATIONAL', rating: 4.6, reviewCount: 88, priceLevel: null, type: 'Restaurant', summary: null, reviews: [{ rating: 5, text: 'Great mole', when: '2026-10-01' }] },
    { url: 'https://temaatx.com', domain: 'temaatx.com', emails: [], text: 'Founded by Maria Lopez', pagesRead: 2 },
  )
  assert.match(text, /legal name Tema LLC/)
  assert.match(text, /PUBLIC RECORDS:\n- Texas liquor license/)
  assert.match(text, /4\.6 stars, 88 reviews/)
  assert.match(text, /never quote them/)
  assert.match(text, /Founded by Maria Lopez/)
})
