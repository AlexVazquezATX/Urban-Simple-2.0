import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'

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

    // Verify all prospects belong to the user's company (include contacts for merge tags)
    const prospects = await prisma.prospect.findMany({
      where: {
        id: { in: prospectIds },
        companyId: user.companyId,
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

    for (const prospectId of prospectIds) {
      if (!validIds.has(prospectId)) {
        skipped++
        errors.push(`Prospect ${prospectId} not found`)
        continue
      }

      // Check if prospect already has an active campaign from this sequence
      const existing = await prisma.outreachCampaign.findFirst({
        where: {
          companyId: user.companyId,
          prospectId,
          name: sequence.name,
          status: { in: ['active', 'draft'] },
        },
      })

      if (existing) {
        const prospect = prospects.find(p => p.id === prospectId)
        skipped++
        errors.push(`${prospect?.companyName || prospectId} already has this sequence active`)
        continue
      }

      try {
        const now = new Date()

        // Create a new campaign for this prospect
        const campaign = await prisma.outreachCampaign.create({
          data: {
            companyId: user.companyId,
            prospectId,
            createdById: user.id,
            name: sequence.name,
            description: sequence.description,
            status: 'active',
          },
        })

        // Resolve merge tags for this prospect
        const prospectData = prospects.find(p => p.id === prospectId)!
        const contact = prospectData.contacts?.[0]
        const addr = prospectData.address as any || {}
        const locationParts = [addr.city, addr.state].filter(Boolean)

        const resolveTags = (text: string | null): string | null => {
          if (!text) return text
          const replacements: Record<string, string> = {
            '{{company_name}}': prospectData.companyName,
            '{{business_name}}': prospectData.companyName,
            '{{contact_name}}': contact ? `${contact.firstName} ${contact.lastName}`.trim() : '',
            '{{first_name}}': contact?.firstName || '',
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

        // Create message records for each step
        let cumulativeDelayDays = 0
        for (const step of sequence.messages) {
          cumulativeDelayDays += step.delayDays

          const scheduledAt = new Date(now)
          scheduledAt.setDate(scheduledAt.getDate() + cumulativeDelayDays)

          await prisma.outreachMessage.create({
            data: {
              campaignId: campaign.id,
              prospectId,
              step: step.step,
              delayDays: step.delayDays,
              channel: step.channel,
              subject: resolveTags(step.subject),
              body: resolveTags(step.body) || step.body,
              isAiGenerated: step.isAiGenerated,
              status: 'pending',
              // Step 1 goes to approval queue; steps 2+ are pre-approved
              approvalStatus: step.step === 1 ? 'pending' : 'approved',
              scheduledAt: step.step === 1 ? null : scheduledAt,
            },
          })
        }

        // Log activity
        await prisma.prospectActivity.create({
          data: {
            prospectId,
            userId: user.id,
            type: 'note',
            channel: 'system',
            title: `Sequence "${sequence.name}" applied`,
            description: `${sequence.messages.length}-step sequence started. Step 1 queued for review.`,
          },
        })

        applied++
      } catch (error: any) {
        const prospect = prospects.find(p => p.id === prospectId)
        skipped++
        errors.push(`${prospect?.companyName || prospectId}: ${error.message}`)
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
