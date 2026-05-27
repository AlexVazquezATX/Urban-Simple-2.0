// Compact context the LLM needs to resolve user phrases like "Horseshoe Bay"
// to record ids, and to know what currently exists when proposing updates.
// Scoped to the user's company. Kept deliberately small (~2k tokens) so it
// fits comfortably alongside the system prompt and conversation history.

import { prisma } from '@/lib/db'

export interface ActionContextClient {
  id: string
  name: string
  status: string
  paymentTerms: string
  parentClientId: string | null
}

export interface ActionContextLocation {
  id: string
  name: string
  clientId: string
  clientName: string
}

export interface ActionContextAgreement {
  id: string
  locationId: string
  locationName: string
  clientName: string
  monthlyAmount: number
  monthlyLaborCost: number | null
  monthlyMaterialCost: number | null
  monthlyOtherCost: number | null
  billingDay: number
  paymentTerms: string
}

export interface ActionContextExpense {
  id: string
  name: string
  category: string
  expenseType: string
  monthlyAmount: number
  vendor: string | null
  isActive: boolean
}

export interface ActionContext {
  clients: ActionContextClient[]
  locations: ActionContextLocation[]
  agreements: ActionContextAgreement[]
  expenses: ActionContextExpense[]
}

/**
 * Fetch the compact action context for a company. All four lists are scoped
 * to the user's company (and branch if set). Soft-deleted records are excluded.
 */
export async function buildActionContext(args: {
  companyId: string
  branchId?: string | null
}): Promise<ActionContext> {
  const { companyId, branchId } = args

  const clientScope = {
    companyId,
    deletedAt: null,
    ...(branchId && { branchId }),
  }

  const [clientsRaw, locationsRaw, agreementsRaw, expensesRaw] = await Promise.all([
    prisma.client.findMany({
      where: clientScope,
      select: {
        id: true,
        name: true,
        status: true,
        paymentTerms: true,
        parentClientId: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.location.findMany({
      where: {
        client: clientScope,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        clientId: true,
        client: { select: { name: true } },
      },
      orderBy: [{ client: { name: 'asc' } }, { name: 'asc' }],
    }),
    prisma.serviceAgreement.findMany({
      where: {
        isActive: true,
        client: clientScope,
      },
      select: {
        id: true,
        locationId: true,
        monthlyAmount: true,
        monthlyLaborCost: true,
        monthlyMaterialCost: true,
        monthlyOtherCost: true,
        billingDay: true,
        paymentTerms: true,
        location: { select: { name: true } },
        client: { select: { name: true } },
      },
      orderBy: [{ client: { name: 'asc' } }, { location: { name: 'asc' } }],
    }),
    prisma.recurringExpense.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        category: true,
        expenseType: true,
        monthlyAmount: true,
        vendor: true,
        isActive: true,
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    }),
  ])

  return {
    clients: clientsRaw.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      paymentTerms: c.paymentTerms,
      parentClientId: c.parentClientId,
    })),
    locations: locationsRaw.map((l) => ({
      id: l.id,
      name: l.name,
      clientId: l.clientId,
      clientName: l.client.name,
    })),
    agreements: agreementsRaw.map((a) => ({
      id: a.id,
      locationId: a.locationId,
      locationName: a.location.name,
      clientName: a.client.name,
      monthlyAmount: Number(a.monthlyAmount),
      monthlyLaborCost: a.monthlyLaborCost === null ? null : Number(a.monthlyLaborCost),
      monthlyMaterialCost:
        a.monthlyMaterialCost === null ? null : Number(a.monthlyMaterialCost),
      monthlyOtherCost: a.monthlyOtherCost === null ? null : Number(a.monthlyOtherCost),
      billingDay: a.billingDay,
      paymentTerms: a.paymentTerms,
    })),
    expenses: expensesRaw.map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      expenseType: e.expenseType,
      monthlyAmount: Number(e.monthlyAmount),
      vendor: e.vendor,
      isActive: e.isActive,
    })),
  }
}

/**
 * Render the action context as a compact string block for the LLM prompt.
 * Designed for token efficiency: short lines, ids inline so the LLM doesn't
 * need a separate search round-trip. The LLM is told to copy ids verbatim.
 */
export function formatActionContextForLLM(ctx: ActionContext): string {
  const clientLines = ctx.clients.map(
    (c) =>
      `- ${c.name} [id=${c.id}] (status=${c.status}, terms=${c.paymentTerms}${c.parentClientId ? `, parent=${c.parentClientId}` : ''})`
  )
  const locationLines = ctx.locations.map(
    (l) => `- ${l.name} [id=${l.id}] (client=${l.clientName} [${l.clientId}])`
  )
  const agreementLines = ctx.agreements.map(
    (a) =>
      `- ${a.clientName} → ${a.locationName} [agreement_id=${a.id}, location_id=${a.locationId}] ($${a.monthlyAmount}/mo, labor=${a.monthlyLaborCost ?? 'null'}, materials=${a.monthlyMaterialCost ?? 'null'}, other=${a.monthlyOtherCost ?? 'null'}, billDay=${a.billingDay}, terms=${a.paymentTerms})`
  )
  const expenseLines = ctx.expenses.map(
    (e) =>
      `- ${e.name} [id=${e.id}] ($${e.monthlyAmount}/mo, category=${e.category}, type=${e.expenseType}${e.vendor ? `, vendor=${e.vendor}` : ''}${e.isActive ? '' : ', PAUSED'})`
  )

  return `
=== ACTION CONTEXT (use the ids verbatim when calling tools) ===

CLIENTS (${ctx.clients.length}):
${clientLines.join('\n') || '(none)'}

LOCATIONS (${ctx.locations.length}):
${locationLines.join('\n') || '(none)'}

ACTIVE SERVICE AGREEMENTS (${ctx.agreements.length}):
${agreementLines.join('\n') || '(none)'}

RECURRING EXPENSES (${ctx.expenses.length}):
${expenseLines.join('\n') || '(none)'}
`.trim()
}
