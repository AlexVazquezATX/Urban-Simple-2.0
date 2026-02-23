import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import {
  generateOutreachMessage,
  type ProspectData,
} from '@/lib/ai/outreach-composer'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pending first-contact messages awaiting approval
    const pendingMessages = await prisma.outreachMessage.findMany({
      where: {
        prospect: {
          companyId: user.companyId,
        },
        approvalStatus: 'pending',
        step: 1, // Only first contacts need approval
        status: 'pending',
      },
      include: {
        prospect: {
          include: {
            contacts: {
              take: 1,
            },
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json({
      messages: pendingMessages.map((m) => ({
        id: m.id,
        prospectId: m.prospectId,
        prospectName: m.prospect?.companyName ?? null,
        contactName: m.prospect?.contacts[0]
          ? `${m.prospect.contacts[0].firstName} ${m.prospect.contacts[0].lastName}`
          : null,
        contactEmail: m.prospect?.contacts[0]?.email ?? null,
        contactPhone: m.prospect?.contacts[0]?.phone ?? null,
        channel: m.channel,
        subject: m.subject,
        body: m.body,
        isAiGenerated: m.isAiGenerated,
        createdAt: m.createdAt,
        campaignName: m.campaign?.name,
      })),
    })
  } catch (error) {
    console.error('Error fetching approval queue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch approval queue' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { messageIds, action } = body // action: 'approve' | 'reject' | 'approve_all'

    if (action === 'approve_all') {
      // Approve all pending first contacts
      const updated = await prisma.outreachMessage.updateMany({
        where: {
          prospect: {
            companyId: user.companyId,
          },
          approvalStatus: 'pending',
          step: 1,
          status: 'pending',
        },
        data: {
          approvalStatus: 'approved',
          approvedAt: new Date(),
          approvedById: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        approved: updated.count,
      })
    }

    // Edit: update message body/subject
    if (action === 'edit') {
      const { messageId, body: newBody, subject: newSubject } = body

      if (!messageId || typeof messageId !== 'string') {
        return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
      }
      if (!newBody || typeof newBody !== 'string' || newBody.trim().length === 0) {
        return NextResponse.json({ error: 'Message body cannot be empty' }, { status: 400 })
      }

      const existing = await prisma.outreachMessage.findFirst({
        where: {
          id: messageId,
          approvalStatus: 'pending',
          prospect: { companyId: user.companyId },
        },
      })

      if (!existing) {
        return NextResponse.json({ error: 'Message not found or not editable' }, { status: 404 })
      }

      const updateData: any = {
        body: newBody.trim(),
        isAiGenerated: false,
      }
      if (newSubject !== undefined) {
        updateData.subject = newSubject.trim() || null
      }

      const updated = await prisma.outreachMessage.update({
        where: { id: messageId },
        data: updateData,
      })

      return NextResponse.json({
        success: true,
        message: { id: updated.id, body: updated.body, subject: updated.subject },
      })
    }

    // Regenerate: AI rewrites the message
    if (action === 'regenerate') {
      const { messageId, customInstructions } = body

      if (!messageId || typeof messageId !== 'string') {
        return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
      }

      const existing = await prisma.outreachMessage.findFirst({
        where: {
          id: messageId,
          approvalStatus: 'pending',
          prospect: { companyId: user.companyId },
        },
        include: {
          prospect: { include: { contacts: true } },
        },
      })

      if (!existing || !existing.prospect) {
        return NextResponse.json({ error: 'Message not found or not regeneratable' }, { status: 404 })
      }

      const prospect = existing.prospect
      const prospectData: ProspectData = {
        companyName: prospect.companyName,
        businessType: prospect.businessType || undefined,
        industry: prospect.industry || undefined,
        address: prospect.address as any,
        website: prospect.website || undefined,
        priceLevel: prospect.priceLevel || undefined,
        contacts: prospect.contacts.map((c) => ({
          firstName: c.firstName,
          lastName: c.lastName,
          title: c.title || undefined,
          email: c.email || undefined,
        })),
        notes: prospect.notes || undefined,
        aiScore: prospect.aiScore || undefined,
        aiScoreReason: prospect.aiScoreReason || undefined,
      }

      const generated = await generateOutreachMessage({
        channel: existing.channel as any,
        prospect: prospectData,
        tone: 'friendly',
        purpose: 'cold_outreach',
        customInstructions: customInstructions || undefined,
      })

      const updated = await prisma.outreachMessage.update({
        where: { id: messageId },
        data: {
          body: generated.body,
          subject: generated.subject || existing.subject,
          isAiGenerated: true,
        },
      })

      return NextResponse.json({
        success: true,
        message: { id: updated.id, body: updated.body, subject: updated.subject },
      })
    }

    // Approve / Reject: bulk action on message IDs
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'Message IDs required' },
        { status: 400 }
      )
    }

    const updateData: any = {
      approvedAt: action === 'approve' ? new Date() : null,
      approvedById: action === 'approve' ? user.id : null,
    }
    updateData.approvalStatus = action === 'approve' ? 'approved' : 'rejected'

    const updated = await prisma.outreachMessage.updateMany({
      where: {
        id: { in: messageIds },
        prospect: {
          companyId: user.companyId,
        },
      },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      updated: updated.count,
    })
  } catch (error) {
    console.error('Error updating approval status:', error)
    return NextResponse.json(
      { error: 'Failed to update approval status' },
      { status: 500 }
    )
  }
}
