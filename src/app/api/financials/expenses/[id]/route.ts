import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canSeeFinancials } from '@/lib/financials'

async function ownedBy(id: string, companyId: string) {
  return prisma.recurringExpense.findFirst({ where: { id, companyId } })
}

// PATCH /api/financials/expenses/[id] — update recurring expense.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canSeeFinancials(user.role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { id } = await params
  const existing = await ownedBy(id, user.companyId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.category !== undefined) data.category = String(body.category).trim() || 'other'
  if (body.monthlyAmount !== undefined) {
    const amt = parseFloat(body.monthlyAmount)
    if (!Number.isFinite(amt) || amt < 0) {
      return NextResponse.json({ error: 'Monthly amount must be non-negative' }, { status: 400 })
    }
    data.monthlyAmount = amt
  }
  if (body.vendor !== undefined) data.vendor = body.vendor?.trim() || null
  if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod?.trim() || null
  if (body.billingDay !== undefined) {
    const day = parseInt(body.billingDay)
    if (!Number.isFinite(day) || day < 1 || day > 31) {
      return NextResponse.json({ error: 'Billing day must be 1-31' }, { status: 400 })
    }
    data.billingDay = day
  }
  if (body.startDate !== undefined) data.startDate = new Date(body.startDate)
  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null
  if (body.isActive !== undefined) data.isActive = !!body.isActive
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null

  const updated = await prisma.recurringExpense.update({ where: { id }, data })
  return NextResponse.json(updated)
}

// DELETE /api/financials/expenses/[id] — hard delete (no foreign keys depend on
// these rows, and there's no "history" concept where soft-delete adds value).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canSeeFinancials(user.role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { id } = await params
  const existing = await ownedBy(id, user.companyId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.recurringExpense.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
