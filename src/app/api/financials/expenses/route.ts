import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canSeeFinancials } from '@/lib/financials'

// GET /api/financials/expenses — list all recurring expenses for the company.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canSeeFinancials(user.role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const expenses = await prisma.recurringExpense.findMany({
    where: { companyId: user.companyId },
    orderBy: [{ isActive: 'desc' }, { category: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(expenses)
}

// POST /api/financials/expenses — create a new recurring expense.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canSeeFinancials(user.role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const {
    name,
    category,
    monthlyAmount,
    vendor,
    paymentMethod,
    billingDay,
    startDate,
    endDate,
    isActive,
    notes,
  } = body

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const amount = parseFloat(monthlyAmount)
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: 'Monthly amount must be a non-negative number' }, { status: 400 })
  }
  const day = billingDay ? parseInt(billingDay) : 1
  if (!Number.isFinite(day) || day < 1 || day > 31) {
    return NextResponse.json({ error: 'Billing day must be between 1 and 31' }, { status: 400 })
  }

  const created = await prisma.recurringExpense.create({
    data: {
      companyId: user.companyId,
      name: name.trim(),
      category: (category || 'other').trim(),
      monthlyAmount: amount,
      vendor: vendor?.trim() || null,
      paymentMethod: paymentMethod?.trim() || null,
      billingDay: day,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      isActive: isActive === undefined ? true : !!isActive,
      notes: notes?.trim() || null,
    },
  })

  return NextResponse.json(created, { status: 201 })
}
