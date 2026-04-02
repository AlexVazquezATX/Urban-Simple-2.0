import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface AttentionItem {
  id: string
  type: 'overdue_invoice' | 'quality_issue' | 'prospect_reply' | 'unassigned_shift'
  title: string
  subtitle: string
  urgency: 'high' | 'medium' | 'low'
  actionUrl: string
  createdAt: string
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const items: AttentionItem[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 1. Overdue invoices
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        client: {
          companyId: user.companyId,
          ...(user.branchId && { branchId: user.branchId }),
        },
        status: { in: ['sent', 'partial'] },
        dueDate: { lt: today },
        balanceDue: { gt: 0 },
      },
      include: {
        client: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    })

    for (const inv of overdueInvoices) {
      const dueDate = new Date(inv.dueDate)
      const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      items.push({
        id: `inv-${inv.id}`,
        type: 'overdue_invoice',
        title: `${inv.client.name} — $${Number(inv.balanceDue).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        subtitle: `${daysPastDue} days past due`,
        urgency: daysPastDue > 60 ? 'high' : daysPastDue > 30 ? 'medium' : 'low',
        actionUrl: `/invoices/${inv.id}`,
        createdAt: inv.dueDate.toISOString(),
      })
    }

    // 2. Unassigned shifts (today or tomorrow, no associate)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 2) // Today + tomorrow

    const unassignedShifts = await prisma.shift.findMany({
      where: {
        branch: {
          companyId: user.companyId,
          ...(user.branchId && { id: user.branchId }),
        },
        date: { gte: today, lt: tomorrow },
        associateId: null,
        status: 'scheduled',
      },
      include: {
        shiftLocations: {
          include: {
            location: { select: { name: true } },
          },
        },
      },
      take: 10,
    })

    for (const shift of unassignedShifts) {
      const locationNames = shift.shiftLocations.map(sl => sl.location.name).join(', ')
      items.push({
        id: `shift-${shift.id}`,
        type: 'unassigned_shift',
        title: `Unassigned shift: ${locationNames || 'No locations'}`,
        subtitle: `${shift.startTime} - ${shift.endTime}`,
        urgency: 'high',
        actionUrl: `/team-hub?tab=schedule`,
        createdAt: shift.date.toISOString(),
      })
    }

    // 3. Prospect replies (outreach messages with status "replied" that haven't been addressed)
    const repliedMessages = await prisma.outreachMessage.findMany({
      where: {
        status: 'replied',
        prospect: {
          companyId: user.companyId,
          status: { notIn: ['won', 'lost'] },
        },
      },
      include: {
        prospect: { select: { id: true, companyName: true } },
      },
      orderBy: { sentAt: 'desc' },
      take: 10,
    })

    for (const msg of repliedMessages) {
      if (!msg.prospect) continue
      items.push({
        id: `reply-${msg.id}`,
        type: 'prospect_reply',
        title: `${msg.prospect.companyName} replied`,
        subtitle: msg.subject || 'Outreach response',
        urgency: 'medium',
        actionUrl: `/growth/prospects/${msg.prospect.id}`,
        createdAt: msg.sentAt?.toISOString() || msg.createdAt.toISOString(),
      })
    }

    // 4. Service reviews with issues (recent, unresolved)
    const recentIssues = await prisma.serviceReview.findMany({
      where: {
        location: {
          client: {
            companyId: user.companyId,
          },
        },
        issuesFound: true,
        reviewDate: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      },
      include: {
        location: { select: { name: true } },
        associate: { select: { firstName: true, lastName: true } },
      },
      orderBy: { reviewDate: 'desc' },
      take: 10,
    })

    for (const review of recentIssues) {
      items.push({
        id: `review-${review.id}`,
        type: 'quality_issue',
        title: `Quality issue at ${review.location.name}`,
        subtitle: `Rating: ${Number(review.overallRating).toFixed(1)}/5.0 — ${review.associate.firstName} ${review.associate.lastName}`,
        urgency: Number(review.overallRating) < 3 ? 'high' : 'medium',
        actionUrl: `/operations/nightly-reviews`,
        createdAt: review.reviewDate.toISOString(),
      })
    }

    // Sort by urgency then date
    const urgencyOrder = { high: 0, medium: 1, low: 2 }
    items.sort((a, b) => {
      const urgDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
      if (urgDiff !== 0) return urgDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching attention items:', error)
    return NextResponse.json({ error: 'Failed to fetch attention items' }, { status: 500 })
  }
}
