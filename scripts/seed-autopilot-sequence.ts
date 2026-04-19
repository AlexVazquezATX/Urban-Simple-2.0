// Seed the "Austin Restaurants" autopilot outreach sequence.
//
// Creates a sequence template (OutreachCampaign with prospectId=null,
// autopilot=true) containing 4 steps. Safe to re-run: checks for existing
// sequence by name before inserting, and marks it as the company's default
// autopilot campaign if no default is set yet.
//
// Usage:
//   npx tsx scripts/seed-autopilot-sequence.ts
//
// The script seeds into whichever company has `name = 'Urban Simple'`. Adjust
// COMPANY_NAME_FILTER below if your company row has a different name.

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const COMPANY_NAME_FILTER = 'Urban Simple LLC'
const SEQUENCE_NAME = 'Austin Restaurants Autopilot'
const SEQUENCE_DESCRIPTION =
  '4-step cold outreach sequence for Austin restaurants and hospitality prospects. Autopilot: runs without manual approval, gated by company send window and daily cap.'

const STEPS = [
  {
    step: 1,
    delayDays: 0,
    channel: 'email',
    subject: 'Cleaning for {{company_name}}',
    body: `Hi {{first_name_or_there}},

I'm Alex, owner of Urban Simple. We're a commercial cleaning company based in Austin that specializes in restaurants and hospitality. We currently handle all of the culinary facilities at Horseshoe Bay Resort and The Loren Hotel.

Our crews come in after close and handle the whole space from top to bottom: the full kitchen (hoods, hood filters, equipment, floors, and all surfaces), dining room, and bathrooms. You lock up at night, and walk into a clean restaurant in the morning.

Most of the owners and GMs we work with came to us because their old crew was costing them time, money, or both. If this sounds like something worth exploring for {{company_name}}, just reply to this email and we'll set up a walkthrough whenever works for you.

Thanks,
Alex Vazquez
Urban Simple`,
  },
  {
    step: 2,
    delayDays: 3,
    channel: 'email',
    subject: 'Re: Cleaning for {{company_name}}',
    body: `Hi {{first_name_or_there}},

Bumping my note from earlier in case it got buried. If you'd like to see what we could do for {{company_name}}, just reply and we'll set up a walkthrough at your convenience.

Thanks,
Alex`,
  },
  {
    step: 3,
    delayDays: 4,
    channel: 'email',
    subject: 'A thought on commercial cleaning',
    body: `Hi {{first_name_or_there}},

One more note before I close this out. One of the biggest reasons restaurant owners hire us is the full kitchen clean. A lot of cleaning services skip the hoods, hood filters, and deep equipment work, or charge extra for it. Our standard overnight clean includes all of it, along with the dining room, bathrooms, and whatever else you need.

If you've ever felt nickel and dimed by your current service, or you just want to see what a top to bottom clean looks like, reply to this email and we'll come by for a walkthrough. No pressure.

Thanks,
Alex`,
  },
  {
    step: 4,
    delayDays: 7,
    channel: 'email',
    subject: 'Closing the file on my end',
    body: `Hi {{first_name_or_there}},

I haven't heard back, so I'll stop the emails here. If anything changes down the road, you have my contact.

Wishing you a great quarter at {{company_name}}.

Thanks,
Alex
Urban Simple`,
  },
]

async function main() {
  const company = await prisma.company.findFirst({
    where: { name: COMPANY_NAME_FILTER },
  })
  if (!company) {
    throw new Error(
      `No company found with name "${COMPANY_NAME_FILTER}". Update COMPANY_NAME_FILTER in this script.`
    )
  }

  const creator = await prisma.user.findFirst({
    where: { companyId: company.id, role: 'SUPER_ADMIN' },
  })
  if (!creator) {
    throw new Error(
      `No SUPER_ADMIN user found for company ${company.id}. Create one first.`
    )
  }

  const existing = await prisma.outreachCampaign.findFirst({
    where: {
      companyId: company.id,
      name: SEQUENCE_NAME,
      prospectId: null,
    },
    include: { messages: true },
  })

  if (existing) {
    console.log(
      `Sequence "${SEQUENCE_NAME}" already exists (id=${existing.id}). Updating messages in place.`
    )
    await prisma.outreachMessage.deleteMany({
      where: { campaignId: existing.id, prospectId: null },
    })
    await prisma.outreachMessage.createMany({
      data: STEPS.map(s => ({
        campaignId: existing.id,
        step: s.step,
        delayDays: s.delayDays,
        channel: s.channel,
        subject: s.subject,
        body: s.body,
        isAiGenerated: false,
        status: 'pending',
        approvalStatus: 'approved',
      })),
    })
    await prisma.outreachCampaign.update({
      where: { id: existing.id },
      data: { autopilot: true, description: SEQUENCE_DESCRIPTION },
    })
    console.log(`Updated ${STEPS.length} steps for existing sequence.`)
  } else {
    const created = await prisma.outreachCampaign.create({
      data: {
        companyId: company.id,
        createdById: creator.id,
        name: SEQUENCE_NAME,
        description: SEQUENCE_DESCRIPTION,
        status: 'active',
        autopilot: true,
        messages: {
          create: STEPS.map(s => ({
            step: s.step,
            delayDays: s.delayDays,
            channel: s.channel,
            subject: s.subject,
            body: s.body,
            isAiGenerated: false,
            status: 'pending',
            approvalStatus: 'approved',
          })),
        },
      },
    })
    console.log(`Created sequence "${SEQUENCE_NAME}" (id=${created.id}) with ${STEPS.length} steps.`)
  }

  // Set this sequence as the default autopilot if none is configured yet.
  if (!company.defaultAutopilotCampaignId) {
    const seq = await prisma.outreachCampaign.findFirst({
      where: { companyId: company.id, name: SEQUENCE_NAME, prospectId: null },
    })
    if (seq) {
      await prisma.company.update({
        where: { id: company.id },
        data: { defaultAutopilotCampaignId: seq.id },
      })
      console.log(`Set "${SEQUENCE_NAME}" as default autopilot sequence.`)
    }
  } else {
    console.log(
      `Company already has a default autopilot campaign (${company.defaultAutopilotCampaignId}). Not overwriting.`
    )
  }

  console.log('Done.')
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
