// Backfill the Comms Hub (comm_messages) from historical sources:
//   - OutreachMessage (sent outreach, with tracking stamps)
//   - EmailLog (invoice / reminder / transactional sends — write-only until now)
//   - ProspectActivity outcome='replied' (inbound replies ingested before the hub)
//
// Idempotent: every row carries (source_type, source_id) with a unique
// constraint; reruns skip duplicates. Run AFTER applying the schema:
//   npm run apply-sql -- scripts/apply-comms-schema.sql
//   npx tsx scripts/backfill-comms.ts
import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient, Prisma } from '@prisma/client'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

function threadKeyFor(counterpartEmail: string | null | undefined, subject: string | null | undefined): string | null {
  if (!counterpartEmail) return null
  const normSubject = (subject ?? '').replace(/^\s*((re|fwd?|aw)\s*:\s*)+/i, '').trim().toLowerCase().slice(0, 120)
  return `${counterpartEmail.trim().toLowerCase()}::${normSubject}`
}

async function main() {
  // Single-tenant fallback company for EmailLog rows (no companyId on that table).
  const alex = await prisma.user.findFirst({ where: { email: 'alex@urbansimple.net' }, select: { companyId: true } })
  if (!alex) throw new Error('alex@urbansimple.net not found — cannot resolve default company')
  const companyId = alex.companyId

  const rows: Prisma.CommMessageCreateManyInput[] = []

  // 1. Sent outreach messages
  const outreach = await prisma.outreachMessage.findMany({
    where: { sentAt: { not: null }, channel: 'email' },
    include: { prospect: { select: { companyId: true, contacts: { take: 1, select: { email: true } } } } },
  })
  for (const m of outreach) {
    rows.push({
      companyId: m.prospect?.companyId ?? companyId,
      direction: 'outbound',
      channel: 'email',
      category: 'outreach',
      toEmail: m.prospect?.contacts[0]?.email?.toLowerCase() ?? null,
      subject: m.subject,
      body: m.body?.slice(0, 20_000) ?? null,
      prospectId: m.prospectId,
      userId: m.approvedById,
      resendEmailId: m.resendEmailId,
      threadKey: threadKeyFor(m.prospect?.contacts[0]?.email, m.subject),
      status: ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'replied', 'failed'].includes(m.status) ? m.status : 'sent',
      sentAt: m.sentAt,
      deliveredAt: m.deliveredAt,
      openedAt: m.openedAt,
      clickedAt: m.clickedAt,
      bouncedAt: m.bouncedAt,
      sourceType: 'outreach_message',
      sourceId: m.id,
      createdAt: m.sentAt ?? m.createdAt,
    })
  }

  // 2. EmailLog (billing / transactional)
  const logs = await prisma.emailLog.findMany()
  for (const l of logs) {
    const isBilling = /invoice|reminder|payment/i.test(l.subject)
    rows.push({
      companyId,
      direction: 'outbound',
      channel: 'email',
      category: isBilling ? 'billing' : 'transactional',
      toEmail: l.recipientEmail?.toLowerCase() ?? null,
      subject: l.subject,
      body: l.body?.slice(0, 20_000) || null,
      threadKey: threadKeyFor(l.recipientEmail, l.subject),
      status: l.status === 'queued' ? 'sent' : l.status,
      sentAt: l.sentAt ?? l.createdAt,
      openedAt: l.openedAt,
      clickedAt: l.clickedAt,
      sourceType: 'email_log',
      sourceId: l.id,
      createdAt: l.sentAt ?? l.createdAt,
    })
  }

  // 3. Inbound replies logged as activities before the hub existed
  const replies = await prisma.prospectActivity.findMany({
    where: { outcome: 'replied' },
    include: { prospect: { select: { companyId: true } } },
  })
  for (const a of replies) {
    const from = (a.metadata as Record<string, unknown> | null)?.from
    rows.push({
      companyId: a.prospect?.companyId ?? companyId,
      direction: 'inbound',
      channel: 'email',
      category: 'reply',
      fromEmail: typeof from === 'string' ? from.toLowerCase() : null,
      subject: a.subject,
      body: a.messageBody?.slice(0, 20_000) ?? null,
      prospectId: a.prospectId,
      threadKey: threadKeyFor(typeof from === 'string' ? from : null, a.subject),
      status: 'received',
      receivedAt: a.sentAt ?? a.createdAt,
      triageState: 'done', // historical — assume handled
      sourceType: 'prospect_activity',
      sourceId: a.id,
      createdAt: a.sentAt ?? a.createdAt,
    })
  }

  const result = await prisma.commMessage.createMany({ data: rows, skipDuplicates: true })
  console.log(`Backfill: ${rows.length} candidate rows (${outreach.length} outreach, ${logs.length} email logs, ${replies.length} replies) → ${result.count} inserted (${rows.length - result.count} already present)`)
}

main()
  .catch((e) => { console.error('backfill-comms failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
