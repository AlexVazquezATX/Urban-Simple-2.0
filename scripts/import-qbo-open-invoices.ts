/**
 * Backfill open QBO invoices into the portal for ACTIVE clients only.
 *
 *   npx tsx scripts/import-qbo-open-invoices.ts --file <qbo-invoices.json>          # dry run
 *   npx tsx scripts/import-qbo-open-invoices.ts --file <qbo-invoices.json> --apply  # write
 *
 * Input file is the raw qbo_sales_get_invoices MCP payload ({ data: [...] }).
 * Idempotent: invoices already carrying a qbInvoiceId are skipped, so re-runs
 * only add what's new. Customers not in CUSTOMER_MAP are ignored (dead/stale
 * accounts stay out of the portal by design).
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// QBO customer (numeric id) -> active portal client. Matched by billing email
// where names diverge: PMC Cleaning bills the Meta account, Aloft Austin
// Downtown is the Caroline (White Lodging) account.
const CUSTOMER_MAP: Record<string, { clientId: string; portalName: string }> = {
  '1001': { clientId: 'cmosuutb5003x0znoiytouo6v', portalName: '5750 Balcones Dr / Balcones Office' },
  '971':  { clientId: 'cmosuunbc00240znop2i05bxq', portalName: 'Bar Hacienda' },
  '837':  { clientId: 'cmosuur1900390znoizwtmau6', portalName: "Black's BBQ" },
  '584':  { clientId: 'cmosuuq6x00300znoy93sejiv', portalName: 'Capital Grille' },
  '844':  { clientId: 'cmosuup2v002o0zno0nuuf1fz', portalName: 'Caroline (White Lodging)' },
  '812':  { clientId: 'cmosuuld5001j0zno6lt81yoc', portalName: 'Chameleon Group' },
  '851':  { clientId: 'cmosuug0500010zno69wsa010', portalName: 'Horseshoe Bay Resort' },
  '915':  { clientId: 'cmosuurn0003f0znop8vdj80n', portalName: 'Meta' },
  '983':  { clientId: 'cmosuuuf300490znoflchbj75', portalName: 'Nectarine' },
  '979':  { clientId: 'cmosuutv300430zno7pv4bamt', portalName: 'Plate by Dzintra' },
  '136':  { clientId: 'cmosuujz200140znoj4kxcxgi', portalName: 'Tarka Indian Kitchen' },
  '982':  { clientId: 'cmosuupmy002u0znovmbs7kwm', portalName: 'The Loren Hotel' },
}

type QboLine = {
  id?: string
  description?: string
  quantity?: string
  rate?: string
  amount?: string
  item_name?: string
  subtotal?: number
}

type QboInvoice = {
  id: string
  amount: string
  balance_amount: string
  due_date: string
  txn_date: string
  reference_number?: string
  private_memo?: string
  contact: { display_name: string; id: string; email?: string }
  lines: QboLine[]
}

const numericId = (opaque: string) => opaque.split(':').pop() ?? opaque

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const fileIdx = args.indexOf('--file')
  if (fileIdx === -1 || !args[fileIdx + 1]) {
    console.error('Usage: tsx scripts/import-qbo-open-invoices.ts --file <path> [--apply]')
    process.exit(1)
  }

  const payload = JSON.parse(readFileSync(args[fileIdx + 1], 'utf8'))
  const invoices: QboInvoice[] = payload.data

  const open = invoices.filter((inv) => Number(inv.balance_amount) > 0)
  const matched = open.filter((inv) => CUSTOMER_MAP[numericId(inv.contact.id)])
  const skippedCustomers = new Map<string, { count: number; balance: number }>()
  for (const inv of open) {
    if (CUSTOMER_MAP[numericId(inv.contact.id)]) continue
    const prev = skippedCustomers.get(inv.contact.display_name) ?? { count: 0, balance: 0 }
    skippedCustomers.set(inv.contact.display_name, {
      count: prev.count + 1,
      balance: prev.balance + Number(inv.balance_amount),
    })
  }

  console.log(`Open QBO invoices: ${open.length}`)
  console.log(`Matched to active portal clients: ${matched.length}`)
  console.log(`Skipped (no active portal client): ${open.length - matched.length} across ${skippedCustomers.size} customers`)
  for (const [name, s] of [...skippedCustomers.entries()].sort((a, b) => b[1].balance - a[1].balance)) {
    console.log(`  - ${name}: ${s.count} invoice(s), $${s.balance.toFixed(2)}`)
  }

  const existing = new Set(
    (await prisma.invoice.findMany({
      where: { qbInvoiceId: { not: null } },
      select: { qbInvoiceId: true },
    })).map((i) => i.qbInvoiceId as string)
  )

  let created = 0
  let skippedExisting = 0
  const perClient = new Map<string, { count: number; balance: number }>()

  for (const inv of matched) {
    const qbInvoiceId = numericId(inv.id)
    const qbCustomerId = numericId(inv.contact.id)
    const map = CUSTOMER_MAP[qbCustomerId]

    if (existing.has(qbInvoiceId)) {
      skippedExisting++
      continue
    }

    const total = Number(inv.amount)
    const balance = Number(inv.balance_amount)
    const amountPaid = Math.max(0, +(total - balance).toFixed(2))

    const realLines = (inv.lines ?? []).filter((l) => l.subtotal === undefined)
    const subtotalEntry = (inv.lines ?? []).find((l) => l.subtotal !== undefined)
    const subtotal = subtotalEntry?.subtotal ?? realLines.reduce((s, l) => s + Number(l.amount ?? 0), 0)
    const taxAmount = +(total - subtotal).toFixed(2)

    const invoiceNumber = inv.reference_number ? inv.reference_number : `QB-${qbInvoiceId}`

    const stats = perClient.get(map.portalName) ?? { count: 0, balance: 0 }
    perClient.set(map.portalName, { count: stats.count + 1, balance: stats.balance + balance })

    if (!apply) {
      created++
      continue
    }

    await prisma.invoice.create({
      data: {
        clientId: map.clientId,
        invoiceNumber,
        status: amountPaid > 0 ? 'partial' : 'sent',
        issueDate: new Date(inv.txn_date),
        dueDate: new Date(inv.due_date),
        subtotal,
        taxAmount: taxAmount >= 0 ? taxAmount : 0,
        totalAmount: total,
        amountPaid,
        balanceDue: balance,
        notes: inv.private_memo || null,
        sentAt: new Date(inv.txn_date),
        qbInvoiceId,
        lineItems: {
          create: realLines.map((l, idx) => ({
            description: l.description || l.item_name || 'Service',
            quantity: Number(l.quantity ?? 1),
            unitPrice: Number(l.rate ?? l.amount ?? 0),
            amount: Number(l.amount ?? 0),
            sortOrder: idx,
          })),
        },
      },
    })
    created++
  }

  if (apply) {
    for (const [qbCustomerId, map] of Object.entries(CUSTOMER_MAP)) {
      await prisma.client.update({
        where: { id: map.clientId },
        data: { qbCustomerId },
      })
    }
  }

  console.log('')
  console.log(`${apply ? 'Imported' : 'Would import'}: ${created} invoice(s); already present: ${skippedExisting}`)
  for (const [name, s] of [...perClient.entries()].sort((a, b) => b[1].balance - a[1].balance)) {
    console.log(`  - ${name}: ${s.count} invoice(s), $${s.balance.toFixed(2)} open`)
  }
  const grand = [...perClient.values()].reduce((s, v) => s + v.balance, 0)
  console.log(`Total open balance ${apply ? 'imported' : 'to import'}: $${grand.toFixed(2)}`)
  if (apply) console.log('Client qbCustomerId links updated for all mapped clients.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
