import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { enrollProspectInSequence } from '@/lib/services/outreach-enroll'

// POST /api/growth/outreach/sequences/[id]/apply — Apply a sequence to prospects
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: sequenceId } = await params
    const body = await request.json()
    const { prospectIds } = body

    if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json(
        { error: 'prospectIds array is required' },
        { status: 400 }
      )
    }

    // Fetch the sequence template with its steps
    const sequence = await prisma.outreachCampaign.findFirst({
      where: {
        id: sequenceId,
        companyId: user.companyId,
        prospectId: null, // Must be a template, not an applied campaign
      },
      include: {
        messages: {
          orderBy: { step: 'asc' },
        },
      },
    })

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    if (sequence.messages.length === 0) {
      return NextResponse.json({ error: 'Sequence has no steps' }, { status: 400 })
    }

    // Fetch company autopilot config once (only needed if template.autopilot=true)
    const company = sequence.autopilot
      ? await prisma.company.findUnique({
          where: { id: user.companyId },
          select: {
            id: true,
            autopilotSendHourStart: true,
            autopilotSendHourEnd: true,
            autopilotSendDaysOfWeek: true,
            branches: { select: { timezone: true }, take: 1 },
          },
        })
      : null

    const companyAutopilot = company
      ? {
          id: company.id,
          timezone: company.branches[0]?.timezone || 'America/Chicago',
          autopilotSendHourStart: company.autopilotSendHourStart,
          autopilotSendHourEnd: company.autopilotSendHourEnd,
          autopilotSendDaysOfWeek: company.autopilotSendDaysOfWeek,
        }
      : null

    // Verify all prospects belong to the user's company (include contacts for merge tags)
    const prospects = await prisma.prospect.findMany({
      where: {
        id: { in: prospectIds },
        companyId: user.companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        companyName: true,
        address: true,
        contacts: {
          take: 1,
          select: {
            firstName: true,
            lastName: true,
            title: true,
            email: true,
          },
        },
      },
    })

    const validIds = new Set(prospects.map(p => p.id))

    let applied = 0
    let skipped = 0
    const errors: string[] = []

    const template = {
      id: sequence.id,
      name: sequence.name,
      description: sequence.description,
      autopilot: sequence.autopilot,
      messages: sequence.messages.map(m => ({
        step: m.step,
        delayDays: m.delayDays,
        channel: m.channel,
        subject: m.subject,
        body: m.body,
        isAiGenerated: m.isAiGenerated,
      })),
    }

    for (const prospectId of prospectIds) {
      if (!validIds.has(prospectId)) {
        skipped++
        errors.push(`Prospect ${prospectId} not found`)
        continue
      }

      const prospect = prospects.find(p => p.id === prospectId)!

      try {
        const result = await enrollProspectInSequence({
          template,
          prospect,
          companyId: user.companyId,
          userId: user.id,
          company: companyAutopilot,
        })

        if ('skipped' in result) {
          skipped++
          errors.push(`${prospect.companyName}: ${result.reason}`)
        } else {
          applied++
        }
      } catch (error: any) {
        skipped++
        errors.push(`${prospect.companyName}: ${error.message}`)
      }
    }

    return NextResponse.json({
      applied,
      skipped,
      total: prospectIds.length,
      errors: errors.slice(0, 10),
    })
  } catch (error) {
    console.error('Error applying sequence:', error)
    return NextResponse.json(
      { error: 'Failed to apply sequence' },
      { status: 500 }
    )
  }
}
