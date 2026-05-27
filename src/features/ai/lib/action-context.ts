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

export interface ActionContextProspect {
  id: string
  companyName: string
  status: string
  priority: string
}

export interface ActionContextIssue {
  id: string
  title: string
  status: string
  severity: string
  locationName: string
}

export interface ActionContextContact {
  id: string
  clientId: string
  clientName: string
  name: string
  role: string
}

export interface ActionContextAssignment {
  id: string
  locationName: string
  userName: string
  isActive: boolean
}

export interface ActionContextChecklistTemplate {
  id: string
  name: string
  isActive: boolean
}

export interface ActionContextInvoice {
  id: string
  invoiceNumber: string
  clientName: string
  status: string
  totalAmount: number
}

export interface ActionContextOutreachDraft {
  id: string
  prospectName: string
  subject: string | null
  channel: string
  approvalStatus: string
}

export interface ActionContext {
  clients: ActionContextClient[]
  locations: ActionContextLocation[]
  agreements: ActionContextAgreement[]
  expenses: ActionContextExpense[]
  prospects: ActionContextProspect[]
  issues: ActionContextIssue[]
  contacts: ActionContextContact[]
  assignments: ActionContextAssignment[]
  checklists: ActionContextChecklistTemplate[]
  invoices: ActionContextInvoice[]
  outreachDrafts: ActionContextOutreachDraft[]
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

  const [
    clientsRaw,
    locationsRaw,
    agreementsRaw,
    expensesRaw,
    prospectsRaw,
    issuesRaw,
    contactsRaw,
    assignmentsRaw,
    checklistsRaw,
    invoicesRaw,
    outreachDraftsRaw,
  ] = await Promise.all([
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
    // Prospects (active only — exclude won/lost so the list stays tight).
    prisma.prospect.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { notIn: ['won', 'lost'] },
      },
      select: {
        id: true,
        companyName: true,
        status: true,
        priority: true,
      },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      take: 200,
    }),
    // Issues — only open/in-progress, recent first.
    prisma.issue.findMany({
      where: {
        client: { companyId },
        status: { in: ['open', 'in_progress'] },
      },
      select: {
        id: true,
        title: true,
        status: true,
        severity: true,
        location: { select: { name: true } },
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    }),
    // Contacts for active clients in this branch scope.
    prisma.clientContact.findMany({
      where: { client: clientScope },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        clientId: true,
        client: { select: { name: true } },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      take: 250,
    }),
    // Active location assignments.
    prisma.locationAssignment.findMany({
      where: {
        isActive: true,
        location: { client: clientScope },
      },
      select: {
        id: true,
        isActive: true,
        location: { select: { name: true } },
        user: { select: { firstName: true, lastName: true, displayName: true } },
      },
      orderBy: { startDate: 'desc' },
      take: 150,
    }),
    // Active checklist templates.
    prisma.checklistTemplate.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: 'asc' },
      take: 100,
    }),
    // Open / draft / sent invoices (skip paid + void).
    prisma.invoice.findMany({
      where: {
        client: clientScope,
        status: { notIn: ['paid', 'void'] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        client: { select: { name: true } },
      },
      orderBy: { issueDate: 'desc' },
      take: 60,
    }),
    // Outreach drafts pending approval.
    prisma.outreachMessage.findMany({
      where: {
        approvalStatus: 'pending',
        prospect: { companyId, deletedAt: null },
      },
      select: {
        id: true,
        subject: true,
        channel: true,
        approvalStatus: true,
        prospect: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
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
    prospects: prospectsRaw.map((p) => ({
      id: p.id,
      companyName: p.companyName,
      status: p.status,
      priority: p.priority,
    })),
    issues: issuesRaw.map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status,
      severity: i.severity,
      locationName: i.location.name,
    })),
    contacts: contactsRaw.map((c) => ({
      id: c.id,
      clientId: c.clientId,
      clientName: c.client.name,
      name: `${c.firstName} ${c.lastName}`.trim(),
      role: c.role,
    })),
    assignments: assignmentsRaw.map((a) => ({
      id: a.id,
      locationName: a.location.name,
      userName:
        a.user.displayName ||
        `${a.user.firstName} ${a.user.lastName}`.trim() ||
        'Unknown',
      isActive: a.isActive,
    })),
    checklists: checklistsRaw.map((c) => ({
      id: c.id,
      name: c.name,
      isActive: c.isActive,
    })),
    invoices: invoicesRaw.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      clientName: i.client.name,
      status: i.status,
      totalAmount: Number(i.totalAmount),
    })),
    outreachDrafts: outreachDraftsRaw.map((m) => ({
      id: m.id,
      prospectName: m.prospect?.companyName ?? '(no prospect)',
      subject: m.subject,
      channel: m.channel,
      approvalStatus: m.approvalStatus,
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
  const prospectLines = ctx.prospects.map(
    (p) =>
      `- ${p.companyName} [id=${p.id}] (status=${p.status}, priority=${p.priority})`
  )
  const issueLines = ctx.issues.map(
    (i) =>
      `- ${i.title} [id=${i.id}] (severity=${i.severity}, status=${i.status}, location=${i.locationName})`
  )
  const contactLines = ctx.contacts.map(
    (c) => `- ${c.name} [id=${c.id}] (client=${c.clientName} [${c.clientId}], role=${c.role})`
  )
  const assignmentLines = ctx.assignments.map(
    (a) => `- ${a.userName} → ${a.locationName} [id=${a.id}]${a.isActive ? '' : ' (inactive)'}`
  )
  const checklistLines = ctx.checklists.map(
    (c) => `- ${c.name} [id=${c.id}]${c.isActive ? '' : ' (inactive)'}`
  )
  const invoiceLines = ctx.invoices.map(
    (i) =>
      `- ${i.invoiceNumber} [id=${i.id}] (client=${i.clientName}, status=${i.status}, total=$${i.totalAmount})`
  )
  const outreachDraftLines = ctx.outreachDrafts.map(
    (m) =>
      `- ${m.prospectName} [id=${m.id}] (channel=${m.channel}, approval=${m.approvalStatus}${m.subject ? `, subject="${m.subject.slice(0, 60)}"` : ''})`
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

PROSPECTS — active pipeline (${ctx.prospects.length}):
${prospectLines.join('\n') || '(none)'}

OPEN ISSUES (${ctx.issues.length}):
${issueLines.join('\n') || '(none)'}

CLIENT CONTACTS (${ctx.contacts.length}):
${contactLines.join('\n') || '(none)'}

ACTIVE LOCATION ASSIGNMENTS (${ctx.assignments.length}):
${assignmentLines.join('\n') || '(none)'}

CHECKLIST TEMPLATES (${ctx.checklists.length}):
${checklistLines.join('\n') || '(none)'}

OPEN INVOICES (${ctx.invoices.length}):
${invoiceLines.join('\n') || '(none)'}

OUTREACH DRAFTS pending approval (${ctx.outreachDrafts.length}):
${outreachDraftLines.join('\n') || '(none)'}
`.trim()
}
