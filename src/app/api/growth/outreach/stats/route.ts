import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { getCurrentUser } from '@/lib/auth'

// GET /api/growth/outreach/stats
export async function GET(request: NextRequest) {
  try {
    // Support both API key auth and session auth
    const apiUser = await getAuthenticatedUser(request)
    const sessionUser = !apiUser ? await getCurrentUser() : null
    const user = apiUser || sessionUser

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = user.companyId

    // Get all outreach messages for this company that have been sent (or beyond)
    const messages = await prisma.outreachMessage.findMany({
      where: {
        prospect: { companyId },
        status: { in: ['sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed'] },
      },
      select: {
        id: true,
        status: true,
        channel: true,
        step: true,
        sentAt: true,
        deliveredAt: true,
        openedAt: true,
        clickedAt: true,
        bouncedAt: true,
        openCount: true,
        clickCount: true,
        campaign: {
          select: { id: true, name: true },
        },
      },
    })

    const total = messages.length
    const sent = messages.filter(m => m.sentAt).length
    const delivered = messages.filter(m => m.deliveredAt).length
    const opened = messages.filter(m => m.openedAt).length
    const clicked = messages.filter(m => m.clickedAt).length
    const bounced = messages.filter(m => m.bouncedAt).length
    const replied = messages.filter(m => m.status === 'replied').length
    const failed = messages.filter(m => m.status === 'failed').length

    // Rates (based on delivered for open/click, based on sent for delivery/bounce)
    const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0
    const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : (sent > 0 ? Math.round((opened / sent) * 100) : 0)
    const clickRate = opened > 0 ? Math.round((clicked / opened) * 100) : 0
    const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0
    const bounceRate = sent > 0 ? Math.round((bounced / sent) * 100) : 0

    // Total opens/clicks (including repeats)
    const totalOpens = messages.reduce((sum, m) => sum + m.openCount, 0)
    const totalClicks = messages.reduce((sum, m) => sum + m.clickCount, 0)

    // Per-sequence breakdown
    const sequenceMap = new Map<string, { name: string; sent: number; delivered: number; opened: number; clicked: number; replied: number; bounced: number }>()
    for (const m of messages) {
      if (!m.campaign) continue
      const key = m.campaign.id
      if (!sequenceMap.has(key)) {
        sequenceMap.set(key, { name: m.campaign.name, sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 })
      }
      const seq = sequenceMap.get(key)!
      if (m.sentAt) seq.sent++
      if (m.deliveredAt) seq.delivered++
      if (m.openedAt) seq.opened++
      if (m.clickedAt) seq.clicked++
      if (m.status === 'replied') seq.replied++
      if (m.bouncedAt) seq.bounced++
    }

    const sequences = Array.from(sequenceMap.entries()).map(([id, data]) => ({
      id,
      ...data,
      openRate: data.delivered > 0 ? Math.round((data.opened / data.delivered) * 100) : (data.sent > 0 ? Math.round((data.opened / data.sent) * 100) : 0),
      clickRate: data.opened > 0 ? Math.round((data.clicked / data.opened) * 100) : 0,
    }))

    // Per-step breakdown
    const stepMap = new Map<number, { sent: number; delivered: number; opened: number; clicked: number; replied: number; bounced: number }>()
    for (const m of messages) {
      if (!stepMap.has(m.step)) {
        stepMap.set(m.step, { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 })
      }
      const s = stepMap.get(m.step)!
      if (m.sentAt) s.sent++
      if (m.deliveredAt) s.delivered++
      if (m.openedAt) s.opened++
      if (m.clickedAt) s.clicked++
      if (m.status === 'replied') s.replied++
      if (m.bouncedAt) s.bounced++
    }

    const steps = Array.from(stepMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([step, data]) => ({
        step,
        ...data,
        openRate: data.delivered > 0 ? Math.round((data.opened / data.delivered) * 100) : (data.sent > 0 ? Math.round((data.opened / data.sent) * 100) : 0),
      }))

    // Daily send volume (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentMessages = messages.filter(m => m.sentAt && new Date(m.sentAt) >= thirtyDaysAgo)
    const dailyMap = new Map<string, number>()
    for (const m of recentMessages) {
      if (!m.sentAt) continue
      const day = new Date(m.sentAt).toISOString().split('T')[0]
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1)
    }
    const dailyVolume = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    // Pipeline summary (pending messages)
    const pipeline = await prisma.outreachMessage.groupBy({
      by: ['approvalStatus', 'status'],
      where: {
        prospect: { companyId },
        status: 'pending',
      },
      _count: true,
    })

    const pendingReview = pipeline
      .filter(p => p.approvalStatus === 'pending')
      .reduce((sum, p) => sum + p._count, 0)
    const readyToSend = pipeline
      .filter(p => p.approvalStatus === 'approved')
      .reduce((sum, p) => sum + p._count, 0)

    return NextResponse.json({
      overview: {
        total,
        sent,
        delivered,
        opened,
        clicked,
        replied,
        bounced,
        failed,
        totalOpens,
        totalClicks,
      },
      rates: {
        deliveryRate,
        openRate,
        clickRate,
        replyRate,
        bounceRate,
      },
      pipeline: {
        pendingReview,
        readyToSend,
      },
      sequences,
      steps,
      dailyVolume,
    })
  } catch (error) {
    console.error('Error fetching outreach stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch outreach stats' },
      { status: 500 }
    )
  }
}
