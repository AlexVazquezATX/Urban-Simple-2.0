// Queues the two follow-ups for lead machine first emails sent before cold
// follow-ups existed. Each account is done once; anything already replied to,
// opted out or moved on is skipped.
//
//   npx tsx scripts/backfill-cold-followups.ts          lists what it would do
//   npx tsx scripts/backfill-cold-followups.ts --apply  creates them

import { config } from 'dotenv'
config({ path: process.env.MAIN_ENV || '.env.local' })

async function main() {
  const { prisma } = await import('../src/lib/db')
  const { queueColdFollowUps } = await import('../src/lib/services/cold-followups')
  const { statusStopsOutreach } = await import('../src/lib/services/outreach-cancel')
  const apply = process.argv.includes('--apply')

  const firsts = await prisma.outreachMessage.findMany({
    where: { step: 1, channel: 'email', sentAt: { not: null }, campaignId: null, prospect: { source: 'lead_machine', deletedAt: null } },
    include: { prospect: { select: { id: true, companyName: true, status: true, source: true, doNotContact: true } } },
    orderBy: { sentAt: 'asc' },
  })
  for (const m of firsts) {
    const p = m.prospect!
    const replied = await prisma.commMessage.count({ where: { prospectId: p.id, direction: 'inbound' } })
    const later = await prisma.outreachMessage.count({ where: { prospectId: p.id, step: { gt: 1 } } })
    const skip = p.doNotContact ? 'do not contact'
      : replied ? 'they replied'
      : later ? 'already has follow-ups'
      : m.bouncedAt ? 'bounced'
      : statusStopsOutreach(p.status, p.source) ? `status ${p.status}`
      : null
    if (skip) {
      console.log(`skip  ${p.companyName}: ${skip}`)
    } else if (!apply) {
      console.log(`would queue  ${p.companyName} (first email ${m.sentAt!.toISOString().slice(0, 10)})`)
    } else {
      const n = await queueColdFollowUps(m.id)
      console.log(`queued ${n}  ${p.companyName}`)
    }
  }
  if (!apply) console.log('\nDry run. Run with --apply to create them.')
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
