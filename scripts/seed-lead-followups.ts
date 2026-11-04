// Creates the "Website lead follow-ups" sequence template, owned by Alex so his
// signature goes on every send. Safe to run twice: an existing template is left
// alone, since it may have been edited in Growth > Outreach > Sequences.
//
//   npx tsx scripts/seed-lead-followups.ts          shows what it would do
//   npx tsx scripts/seed-lead-followups.ts --apply  creates it
//
// New website leads start getting follow-ups as soon as this exists and the
// code that looks for it is deployed.

import { config } from 'dotenv'
config({ path: process.env.MAIN_ENV || '.env.local' })

async function main() {
  const { prisma } = await import('../src/lib/db')
  const { FOLLOWUP_SEQUENCE_NAME, FOLLOWUP_STEPS } = await import('../src/lib/leads/followups')
  const apply = process.argv.includes('--apply')

  const company = await prisma.company.findFirstOrThrow({ where: { name: 'Urban Simple LLC' }, select: { id: true } })
  const alex = await prisma.user.findFirstOrThrow({
    where: { companyId: company.id, email: 'alex@urbansimple.net', isActive: true },
    select: { id: true, emailSignature: true },
  })
  if (!alex.emailSignature) throw new Error('alex@urbansimple.net has no signature, so follow-ups would go out unsigned')

  const existing = await prisma.outreachCampaign.findFirst({
    where: { companyId: company.id, prospectId: null, name: FOLLOWUP_SEQUENCE_NAME },
    select: { id: true, status: true, autopilot: true },
  })
  if (existing) {
    console.log('Already exists, left alone:', existing)
  } else if (!apply) {
    console.log(`Would create "${FOLLOWUP_SEQUENCE_NAME}" with ${FOLLOWUP_STEPS.length} steps. Run with --apply.`)
  } else {
    const created = await prisma.outreachCampaign.create({
      data: {
        companyId: company.id,
        createdById: alex.id,
        name: FOLLOWUP_SEQUENCE_NAME,
        description: 'Sent automatically to website leads on days 2, 5 and 12. Stops on a reply or when someone marks the lead contacted.',
        status: 'active',
        autopilot: true,
        messages: {
          create: FOLLOWUP_STEPS.map((s) => ({
            step: s.step,
            delayDays: s.delayDays,
            channel: 'email',
            subject: s.subject,
            body: s.body,
            status: 'pending',
            approvalStatus: 'approved',
          })),
        },
      },
      select: { id: true },
    })
    console.log('Created', created.id)
  }
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
