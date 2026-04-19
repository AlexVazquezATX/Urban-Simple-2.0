import { prisma } from '@/lib/db'
import { nextSendSlot, slotAfterDays } from './autopilot-schedule'

// Shared enrollment logic used by both the manual "apply sequence" route and
// the automatic CSV-import autopilot enrollment path.
//
// A sequence template is an OutreachCampaign with prospectId=null plus child
// OutreachMessage rows. Enrolling a prospect clones the template into a new
// per-prospect campaign and creates resolved-merge-tag OutreachMessage rows.

type TemplateMessage = {
  step: number
  delayDays: number
  channel: string
  subject: string | null
  body: string
  isAiGenerated: boolean
}

type Template = {
  id: string
  name: string
  description: string | null
  autopilot: boolean
  messages: TemplateMessage[]
}

type ProspectData = {
  id: string
  companyName: string
  address: unknown
  contacts: Array<{
    firstName: string
    lastName: string
    title: string | null
    email: string | null
  }>
}

type CompanyAutopilot = {
  id: string
  timezone: string
  autopilotSendHourStart: number
  autopilotSendHourEnd: number
  autopilotSendDaysOfWeek: number[]
}

function resolveMergeTags(
  text: string | null,
  prospect: ProspectData
): string | null {
  if (!text) return text
  const contact = prospect.contacts?.[0]
  const addr = (prospect.address as Record<string, string> | null) || {}
  const locationParts = [addr.city, addr.state].filter(Boolean)

  const firstName = contact?.firstName?.trim() || ''
  const replacements: Record<string, string> = {
    '{{company_name}}': prospect.companyName,
    '{{business_name}}': prospect.companyName,
    '{{contact_name}}': contact
      ? `${contact.firstName} ${contact.lastName}`.trim()
      : '',
    '{{first_name}}': firstName,
    '{{first_name_or_there}}': firstName || 'there',
    '{{last_name}}': contact?.lastName || '',
    '{{title}}': contact?.title || '',
    '{{location}}': locationParts.join(', '),
    '{{city}}': addr.city || '',
    '{{state}}': addr.state || '',
  }

  let resolved = text
  for (const [tag, value] of Object.entries(replacements)) {
    resolved = resolved.replaceAll(tag, value)
  }
  return resolved
}

export async function enrollProspectInSequence(args: {
  template: Template
  prospect: ProspectData
  companyId: string
  userId: string
  company: CompanyAutopilot | null // required when template.autopilot = true
}): Promise<{ campaignId: string; messagesCreated: number } | { skipped: true; reason: string }> {
  const { template, prospect, companyId, userId, company } = args

  if (template.messages.length === 0) {
    return { skipped: true, reason: 'template_has_no_steps' }
  }

  // Guard: already enrolled in this sequence with an active/draft campaign?
  const existing = await prisma.outreachCampaign.findFirst({
    where: {
      companyId,
      prospectId: prospect.id,
      name: template.name,
      status: { in: ['active', 'draft'] },
    },
    select: { id: true },
  })
  if (existing) {
    return { skipped: true, reason: 'already_enrolled' }
  }

  if (template.autopilot && !company) {
    return { skipped: true, reason: 'missing_company_for_autopilot' }
  }

  // Create the per-prospect campaign.
  const campaign = await prisma.outreachCampaign.create({
    data: {
      companyId,
      prospectId: prospect.id,
      createdById: userId,
      name: template.name,
      description: template.description,
      status: 'active',
      autopilot: template.autopilot,
    },
  })

  // Build scheduled times. For autopilot, respect send window + jitter across
  // valid days. For manual sequences we preserve existing behavior: step 1 is
  // approval-pending with no scheduledAt, steps 2+ are calendar-day delays.
  const now = new Date()
  const scheduledTimes: (Date | null)[] = []

  if (template.autopilot) {
    const win = {
      timezone: company!.timezone,
      hourStart: company!.autopilotSendHourStart,
      hourEnd: company!.autopilotSendHourEnd,
      daysOfWeek: company!.autopilotSendDaysOfWeek,
    }

    let previousSlot = nextSendSlot(now, win, { minLeadMinutes: 5 })
    scheduledTimes.push(previousSlot)
    // Steps 2+: offset by delayDays from the PREVIOUS step's scheduled time.
    for (let i = 1; i < template.messages.length; i++) {
      const step = template.messages[i]
      const next = slotAfterDays(previousSlot, step.delayDays, win)
      scheduledTimes.push(next)
      previousSlot = next
    }
  } else {
    // Manual flow: cumulative day offsets from "now", step 1 has null scheduledAt.
    let cumulative = 0
    for (const step of template.messages) {
      cumulative += step.delayDays
      if (step.step === 1) {
        scheduledTimes.push(null)
      } else {
        const t = new Date(now)
        t.setDate(t.getDate() + cumulative)
        scheduledTimes.push(t)
      }
    }
  }

  for (let i = 0; i < template.messages.length; i++) {
    const step = template.messages[i]
    const scheduledAt = scheduledTimes[i]

    // Autopilot: all steps pre-approved.
    // Manual: step 1 pending, steps 2+ pre-approved (matches existing behavior).
    const approvalStatus = template.autopilot
      ? 'approved'
      : step.step === 1
      ? 'pending'
      : 'approved'

    await prisma.outreachMessage.create({
      data: {
        campaignId: campaign.id,
        prospectId: prospect.id,
        step: step.step,
        delayDays: step.delayDays,
        channel: step.channel,
        subject: resolveMergeTags(step.subject, prospect),
        body: resolveMergeTags(step.body, prospect) || step.body,
        isAiGenerated: step.isAiGenerated,
        status: 'pending',
        approvalStatus,
        scheduledAt,
      },
    })
  }

  // Activity log entry.
  const summary = template.autopilot
    ? `${template.messages.length}-step autopilot sequence started. First send scheduled ${scheduledTimes[0]?.toISOString() ?? 'immediately'}.`
    : `${template.messages.length}-step sequence started. Step 1 queued for review.`

  await prisma.prospectActivity.create({
    data: {
      prospectId: prospect.id,
      userId,
      type: 'note',
      channel: 'system',
      title: `Sequence "${template.name}" applied`,
      description: summary,
    },
  })

  return { campaignId: campaign.id, messagesCreated: template.messages.length }
}
