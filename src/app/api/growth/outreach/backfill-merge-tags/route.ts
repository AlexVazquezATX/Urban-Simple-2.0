import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'

/**
 * POST /api/growth/outreach/backfill-merge-tags
 * One-time backfill: resolve {{merge_tags}} in existing outreach messages
 * that were created before the apply endpoint added tag resolution.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find all pending messages that still contain raw merge tags
    const messages = await prisma.outreachMessage.findMany({
      where: {
        prospect: { companyId: user.companyId },
        status: 'pending',
        OR: [
          { body: { contains: '{{' } },
          { subject: { contains: '{{' } },
        ],
      },
      include: {
        prospect: {
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
        },
      },
    })

    if (messages.length === 0) {
      return NextResponse.json({ updated: 0, message: 'No messages with unresolved merge tags found' })
    }

    let updated = 0

    for (const msg of messages) {
      if (!msg.prospect) continue

      const contact = msg.prospect.contacts?.[0]
      const addr = msg.prospect.address as any || {}
      const locationParts = [addr.city, addr.state].filter(Boolean)

      const replacements: Record<string, string> = {
        '{{company_name}}': msg.prospect.companyName,
        '{{business_name}}': msg.prospect.companyName,
        '{{contact_name}}': contact ? `${contact.firstName} ${contact.lastName}`.trim() : '',
        '{{first_name}}': contact?.firstName || '',
        '{{last_name}}': contact?.lastName || '',
        '{{title}}': contact?.title || '',
        '{{location}}': locationParts.join(', '),
        '{{city}}': addr.city || '',
        '{{state}}': addr.state || '',
      }

      let resolvedBody = msg.body
      let resolvedSubject = msg.subject

      for (const [tag, value] of Object.entries(replacements)) {
        resolvedBody = resolvedBody.replaceAll(tag, value)
        if (resolvedSubject) resolvedSubject = resolvedSubject.replaceAll(tag, value)
      }

      // Only update if something actually changed
      if (resolvedBody !== msg.body || resolvedSubject !== msg.subject) {
        await prisma.outreachMessage.update({
          where: { id: msg.id },
          data: {
            body: resolvedBody,
            subject: resolvedSubject,
          },
        })
        updated++
      }
    }

    return NextResponse.json({
      updated,
      total: messages.length,
      message: `Resolved merge tags in ${updated} messages`,
    })
  } catch (error) {
    console.error('Error backfilling merge tags:', error)
    return NextResponse.json(
      { error: 'Failed to backfill merge tags' },
      { status: 500 }
    )
  }
}
