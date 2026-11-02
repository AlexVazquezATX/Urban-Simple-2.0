// Preview account prep on real prospects without writing anything: no
// contacts, drafts, research rows or run logs are saved. Spends Google,
// Claude and Findymail calls (Findymail capped by FM_BUDGET, default 12).
//   npx tsx scripts/lead-machine-prep-preview.ts --list
//   npx tsx scripts/lead-machine-prep-preview.ts <prospectId> [<prospectId> ...]
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })
// A worktree's .env.local may lack keys the main checkout has.
if (process.env.MAIN_ENV) config({ path: resolve(process.env.MAIN_ENV) })

import { writeFileSync } from 'fs'
import { prisma } from '../src/lib/db'
import { pickRecipient } from '../src/lib/services/outreach-recipient'
import { displayName } from '../src/lib/lead-machine/match'
import { ClaudeWriter } from '../src/lib/lead-machine/prep/claude'
import { greetingName } from '../src/lib/lead-machine/prep/copy'
import { findContacts } from '../src/lib/lead-machine/prep/contacts'
import { Findymail } from '../src/lib/lead-machine/prep/findymail'
import { lookupPlace } from '../src/lib/lead-machine/prep/places-lookup'
import { buildMaterial, draftBrief } from '../src/lib/lead-machine/prep/run'
import { ownDomain, readSite } from '../src/lib/lead-machine/prep/site'

const select = {
  id: true, companyId: true, companyName: true, legalName: true, businessType: true, tags: true, priority: true,
  address: true, website: true, notes: true, createdAt: true,
  contacts: true,
  signals: { where: { kind: { not: 'machine_seen' } }, select: { kind: true, observedAt: true, data: true } },
} as const

async function list() {
  const rows = await prisma.prospect.findMany({
    where: { source: 'lead_machine', status: 'prospect', deletedAt: null, doNotContact: false, outreachMessages: { none: { step: 1 } } },
    select: { id: true, companyName: true, businessType: true, tags: true, priority: true, website: true, createdAt: true, _count: { select: { contacts: true } } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })
  console.log(`${rows.length} machine accounts waiting for prep`)
  for (const r of rows) console.log(`${r.id}  [${r.priority}] ${r.businessType ?? '?'}${r.tags.includes('resort') ? '/resort' : ''}  ${r.companyName}  ${r.website ?? '(no site)'}  contacts:${r._count.contacts}`)
}

async function preview(ids: string[]) {
  const claude = new ClaudeWriter(process.env.ANTHROPIC_API_KEY!)
  const fm = process.env.FINDYMAIL_API_KEY ? new Findymail(process.env.FINDYMAIL_API_KEY, { remaining: Number(process.env.FM_BUDGET ?? 12) }) : null
  if (fm) console.log('Findymail credits before:', await fm.credits())
  const out: unknown[] = []
  const prospects = await prisma.prospect.findMany({ where: { id: { in: ids } }, select })
  for (const p of prospects) {
    const segment = p.tags.includes('resort') ? 'resort' : p.businessType === 'hotel' || p.businessType === 'bar' ? p.businessType : 'restaurant'
    const addr = (p.address ?? {}) as { street?: string; city?: string }
    console.log(`\n=== ${p.companyName} (${segment})`)
    try {
      const place = process.env.GOOGLE_PLACES_API_KEY
        ? await lookupPlace({ apiKey: process.env.GOOGLE_PLACES_API_KEY, name: p.companyName, street: addr.street, city: addr.city }).catch(() => null)
        : null
      const website = p.website || place?.website || null
      const site = website ? await readSite(website) : null
      const signals = p.signals.map((s) => `${s.kind} ${s.observedAt.toISOString().slice(0, 10)} ${JSON.stringify(s.data)}`)
      const notes = await claude.research(buildMaterial(p, segment, signals, place, site))
      let recipient = pickRecipient(p.contacts.filter((c) => c.email)) as { firstName: string; lastName: string; title: string | null; email: string; emailVerificationStatus: string | null; emailSource: string | null } | null
      if (!recipient) {
        const found = await findContacts({ segment, domain: ownDomain(website), decisionMaker: notes.decisionMaker, siteEmails: site?.emails ?? [], findymail: fm })
        recipient = found[0] ?? null
      }
      const greet = greetingName(recipient?.firstName, p.companyName)
      const firstName = greet ? displayName(greet) : null
      const drafted = recipient
        ? await claude.draft(draftBrief(p.companyName, segment, notes, firstName ? { firstName, title: recipient.title } : null), firstName, p.companyName)
        : null
      const row = {
        name: p.companyName, segment, website, siteEmails: site?.emails ?? [], pagesRead: site?.pagesRead ?? [],
        google: place ? { rating: place.rating, reviews: place.reviewCount } : null,
        notes,
        contact: recipient ? { name: [recipient.firstName, recipient.lastName].filter(Boolean).join(' ') || recipient.title, title: recipient.title, email: recipient.email, status: recipient.emailVerificationStatus, source: recipient.emailSource } : null,
        draft: drafted?.draft ?? null,
        problems: drafted?.problems ?? [],
      }
      out.push(row)
      console.log(JSON.stringify(row, null, 2))
    } catch (err) {
      console.log('FAILED:', err instanceof Error ? err.message : err)
      out.push({ name: p.companyName, error: String(err) })
    }
  }
  if (fm) console.log('\nFindymail used:', fm.usage, 'credits after:', await fm.credits())
  console.log('Claude usage:', claude.usage)
  if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(out, null, 2))
}

const args = process.argv.slice(2)
;(args[0] === '--list' ? list() : preview(args))
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
