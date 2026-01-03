import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/billing/ar-aging - Get AR aging report
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket') // current, overdue_31_60, overdue_61_90, overdue_90_plus

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Base query for outstanding invoices
    const whereClause: any = {
      client: {
        companyId: user.companyId,
        ...(user.branchId && { branchId: user.branchId }),
      },
      status: {
        in: ['draft', 'sent', 'partial'],
      },
      balanceDue: {
        gt: 0,
      },
    }

    // Filter by aging bucket if specified
    if (bucket) {
      const daysAgo = (days: number) => {
        const date = new Date(today)
        date.setDate(date.getDate() - days)
        return date
      }

      switch (bucket) {
        case 'current':
          // 0-30 days past due date
          whereClause.dueDate = {
            gte: daysAgo(30),
          }
          break
        case 'overdue_31_60':
          // 31-60 days past due date
          whereClause.dueDate = {
            gte: daysAgo(60),
            lt: daysAgo(30),
          }
          break
        case 'overdue_61_90':
          // 61-90 days past due date
          whereClause.dueDate = {
            gte: daysAgo(90),
            lt: daysAgo(60),
          }
          break
        case 'overdue_90_plus':
          // 90+ days past due date
          whereClause.dueDate = {
            lt: daysAgo(90),
          }
          break
      }
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            billingEmail: true,
            phone: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    })

    // Calculate aging for each invoice
    const invoicesWithAging = invoices.map((invoice) => {
      const dueDate = new Date(invoice.dueDate)
      const daysPastDue = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      let agingBucket = 'current'
      if (daysPastDue > 90) {
        agingBucket = 'overdue_90_plus'
      } else if (daysPastDue > 60) {
        agingBucket = 'overdue_61_90'
      } else if (daysPastDue > 30) {
        agingBucket = 'overdue_31_60'
      } else if (daysPastDue >= 0) {
        agingBucket = 'current'
      }

      return {
        ...invoice,
        daysPastDue,
        agingBucket,
      }
    })

    // Calculate totals by bucket
    const totals = {
      current: 0,
      overdue_31_60: 0,
      overdue_61_90: 0,
      overdue_90_plus: 0,
      total: 0,
    }

    invoicesWithAging.forEach((invoice) => {
      const amount = Number(invoice.balanceDue)
      totals[invoice.agingBucket as keyof typeof totals] += amount
      totals.total += amount
    })

    return NextResponse.json({
      invoices: invoicesWithAging,
      totals,
      counts: {
        current: invoicesWithAging.filter((i) => i.agingBucket === 'current')
          .length,
        overdue_31_60: invoicesWithAging.filter(
          (i) => i.agingBucket === 'overdue_31_60'
        ).length,
        overdue_61_90: invoicesWithAging.filter(
          (i) => i.agingBucket === 'overdue_61_90'
        ).length,
        overdue_90_plus: invoicesWithAging.filter(
          (i) => i.agingBucket === 'overdue_90_plus'
        ).length,
        total: invoicesWithAging.length,
      },
    })
  } catch (error) {
    console.error('Error fetching AR aging:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AR aging report' },
      { status: 500 }
    )
  }
}


