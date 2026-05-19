/**
 * One-shot import for recurring expenses pasted from the prior expense
 * tracker. Parses the user's list, normalizes categories to our enum,
 * preserves payment-plan / tax-deductible info as notes, and creates
 * RecurringExpense rows.
 *
 *   Dry run (default):  npx tsx scripts/import-recurring-expenses.ts
 *   Apply:              npx tsx scripts/import-recurring-expenses.ts --apply
 *
 * Idempotent: skips expenses that already exist by name (case-insensitive).
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const COMPANY_NAME = 'Urban Simple LLC'

interface ExpenseInput {
  name: string
  category: string
  monthlyAmount: number
  vendor: string | null
  paymentMethod: string
  startDate: string // ISO date
  endDate?: string | null
  isActive: boolean
  notes?: string
}

const EXPENSES: ExpenseInput[] = [
  // === Loan-style / multi-month payment plans (endDate set from progress notes) ===
  {
    name: 'AMEX Line of Credit',
    category: 'professional_services',
    monthlyAmount: 4616.67,
    vendor: 'American Express',
    paymentMethod: 'bank transfer',
    startDate: '2026-01-08',
    endDate: '2028-02-08', // 25 months from start
    isActive: true,
    notes: 'Line of credit repayment plan: 25 months total at $4,616.67/mo ($115,416.75 total).',
  },
  {
    name: 'Hormozi Playbooks',
    category: 'professional_services',
    monthlyAmount: 550,
    vendor: null,
    paymentMethod: 'credit card',
    startDate: '2025-08-22',
    endDate: '2026-08-22', // 12 months from start
    isActive: true,
    notes: 'Subscription payment plan: 12 months total at $550/mo ($6,600 total).',
  },
  {
    name: 'Rent',
    category: 'rent',
    monthlyAmount: 7000,
    vendor: 'Rent',
    paymentMethod: 'credit card',
    startDate: '2025-08-12',
    endDate: '2026-08-12', // 12 months
    isActive: true,
    notes: 'Office rent. 12-month lease at $7,000/mo ($84,000 total).',
  },
  {
    name: 'G-Wagon - AMG G-Wagon',
    category: 'vehicles',
    monthlyAmount: 1554,
    vendor: 'G-Wagon',
    paymentMethod: 'bank transfer',
    startDate: '2025-08-13',
    endDate: '2029-02-13', // 42 months
    isActive: true,
    notes: 'Vehicle financing: 42 months at $1,554/mo ($65,268 total).',
  },
  // === Vehicles ===
  {
    name: 'Toyota - Work Vehicle',
    category: 'vehicles',
    monthlyAmount: 600,
    vendor: null,
    paymentMethod: 'credit card',
    startDate: '2025-12-11',
    isActive: true,
  },
  {
    name: 'Ford Escapes (2)',
    category: 'vehicles',
    monthlyAmount: 0,
    vendor: 'Ford Escapes (2)',
    paymentMethod: 'credit card',
    startDate: '2025-08-13',
    isActive: false, // Paid in Full per source
    notes: 'Paid in full. Inactive.',
  },
  {
    name: 'Fuel for Vehicles',
    category: 'vehicles',
    monthlyAmount: 400,
    vendor: 'Fuel for Vehicles',
    paymentMethod: 'credit card',
    startDate: '2025-08-13',
    isActive: true,
    notes: 'Gas for fleet.',
  },
  // === Software / Subscriptions ===
  {
    name: 'Kling AI',
    category: 'software',
    monthlyAmount: 240,
    vendor: null,
    paymentMethod: 'credit card',
    startDate: '2025-12-28',
    isActive: true,
  },
  {
    name: 'Supabase',
    category: 'software',
    monthlyAmount: 25,
    vendor: null,
    paymentMethod: 'credit card',
    startDate: '2025-12-11',
    isActive: true,
  },
  {
    name: 'Claude AI',
    category: 'software',
    monthlyAmount: 100,
    vendor: null,
    paymentMethod: 'credit card',
    startDate: '2025-11-27',
    isActive: true,
  },
  {
    name: 'ChatGPT',
    category: 'software',
    monthlyAmount: 20,
    vendor: 'OpenAI',
    paymentMethod: 'credit card',
    startDate: '2025-11-02',
    isActive: true,
    notes: 'Tax deductible.',
  },
  {
    name: 'Google VEO 3 Pro',
    category: 'software',
    monthlyAmount: 250,
    vendor: null,
    paymentMethod: 'credit card',
    startDate: '2025-09-01',
    isActive: true,
    notes: 'Tax deductible.',
  },
  {
    name: 'Suno',
    category: 'software',
    monthlyAmount: 10.83,
    vendor: 'Suno',
    paymentMethod: 'credit card',
    startDate: '2025-08-20',
    isActive: true,
  },
  {
    name: 'Google Business - GSUITE',
    category: 'software',
    monthlyAmount: 197,
    vendor: 'Google Business',
    paymentMethod: 'credit card',
    startDate: '2025-08-13',
    isActive: true,
  },
  {
    name: 'Adobe',
    category: 'software',
    monthlyAmount: 66,
    vendor: 'Adobe',
    paymentMethod: 'credit card',
    startDate: '2025-08-13',
    isActive: true,
  },
  {
    name: 'Netflix',
    category: 'software',
    monthlyAmount: 12.99,
    vendor: 'Netflix',
    paymentMethod: 'credit card',
    startDate: '2025-08-13',
    isActive: true,
    notes: 'TV / streaming.',
  },
  {
    name: 'Quickbooks - Bookkeeping',
    category: 'software',
    monthlyAmount: 75,
    vendor: 'Quickbooks',
    paymentMethod: 'credit card',
    startDate: '2025-08-13',
    isActive: true,
  },
  {
    name: 'Slack',
    category: 'software',
    monthlyAmount: 200,
    vendor: 'Slack',
    paymentMethod: 'credit card',
    startDate: '2025-08-13',
    isActive: true,
    notes: 'Communication app.',
  },
  {
    name: 'Squarespace & Shopify',
    category: 'software',
    monthlyAmount: 123,
    vendor: 'Squarespace & Shopify',
    paymentMethod: 'credit card',
    startDate: '2025-08-13',
    isActive: true,
    notes: 'Websites.',
  },
  {
    name: 'Base44.com',
    category: 'software',
    monthlyAmount: 50,
    vendor: null,
    paymentMethod: 'credit card',
    startDate: '2025-07-31',
    isActive: true,
    notes: 'Tax deductible.',
  },
  // === Insurance ===
  {
    name: 'Workers Comp',
    category: 'insurance',
    monthlyAmount: 35,
    vendor: 'Workers Comp',
    paymentMethod: 'credit card',
    startDate: '2025-08-13',
    isActive: true,
    notes: 'Insurance for employees.',
  },
  {
    name: 'Nationwide - Insurance',
    category: 'insurance',
    monthlyAmount: 1100,
    vendor: 'Nationwide',
    paymentMethod: 'credit card',
    startDate: '2025-08-13',
    isActive: true,
  },
  // === Marketing ===
  {
    name: 'Meta Marketing',
    category: 'marketing',
    monthlyAmount: 0, // user pasted as $0; likely paused or variable spend
    vendor: null,
    paymentMethod: 'credit card',
    startDate: '2025-08-20',
    isActive: true,
    notes: 'Currently $0 — adjust if/when paid spend resumes.',
  },
  // === Utilities ===
  {
    name: 'AT&T - Office WiFi',
    category: 'utilities',
    monthlyAmount: 150,
    vendor: 'AT&T',
    paymentMethod: 'credit card',
    startDate: '2025-08-13',
    isActive: true,
  },
  {
    name: 'Grasshopper - 1800 phone',
    category: 'utilities',
    monthlyAmount: 18,
    vendor: 'Grasshopper',
    paymentMethod: 'credit card',
    startDate: '2025-08-13',
    isActive: true,
  },
  // === Professional services ===
  {
    name: 'Home Cleanings',
    category: 'professional_services',
    monthlyAmount: 500,
    vendor: 'Gabi Gonzales',
    paymentMethod: 'check',
    startDate: '2025-10-29',
    isActive: true,
  },
  {
    name: 'Quickbooks Merchant - Merchant Fees',
    category: 'professional_services',
    monthlyAmount: 200,
    vendor: 'Quickbooks Merchant',
    paymentMethod: 'credit card',
    startDate: '2025-08-13',
    isActive: true,
  },
  {
    name: 'Bank of America - Online Business Suite',
    category: 'professional_services',
    monthlyAmount: 15,
    vendor: 'Bank of America',
    paymentMethod: 'credit card',
    startDate: '2025-08-13',
    isActive: true,
  },
  {
    name: 'Gusto - Payroll Services',
    category: 'professional_services',
    monthlyAmount: 105,
    vendor: 'Gusto',
    paymentMethod: 'credit card',
    startDate: '2025-08-13',
    isActive: true,
  },
  // === Supplies / Equipment ===
  {
    name: 'MATERIALS - Tools & Equipment',
    category: 'supplies',
    monthlyAmount: 5000,
    vendor: 'MATERIALS',
    paymentMethod: 'credit card',
    startDate: '2025-08-13',
    isActive: true,
  },
  {
    name: "Cothron's - Keys",
    category: 'supplies',
    monthlyAmount: 100,
    vendor: "Cothron's",
    paymentMethod: 'credit card',
    startDate: '2025-08-12',
    isActive: true,
  },
  {
    name: 'Amazon - Supplies & Tools',
    category: 'supplies',
    monthlyAmount: 120,
    vendor: 'Amazon',
    paymentMethod: 'credit card',
    startDate: '2025-08-12',
    isActive: true,
  },
  // === Payroll (founders + managers) ===
  {
    name: "Alex's Monthly Salary",
    category: 'payroll',
    monthlyAmount: 9856,
    vendor: 'Alex Vazquez',
    paymentMethod: 'bank transfer',
    startDate: '2023-01-17',
    isActive: true,
  },
  {
    name: "Demian's Monthly Salary",
    category: 'payroll',
    monthlyAmount: 8972,
    vendor: 'Demian Vazquez',
    paymentMethod: 'bank transfer',
    startDate: '2023-01-17',
    isActive: true,
  },
  {
    name: 'Julio Estevez - Manager',
    category: 'payroll',
    monthlyAmount: 5099.62,
    vendor: 'Julio Estevez',
    paymentMethod: 'bank transfer',
    startDate: '2025-08-13',
    isActive: true,
  },
  {
    name: 'Secondary Manager',
    category: 'payroll',
    monthlyAmount: 1000,
    vendor: 'Subcontracted Manager',
    paymentMethod: 'bank transfer',
    startDate: '2025-08-13',
    isActive: true,
  },
  // === Other / Misc ===
  {
    name: 'MISC - Miscellaneous',
    category: 'other',
    monthlyAmount: 300,
    vendor: 'MISC',
    paymentMethod: 'credit card',
    startDate: '2025-08-12',
    isActive: true,
  },
]

async function main() {
  console.log(APPLY ? 'APPLY MODE\n' : 'DRY RUN — use --apply to commit.\n')

  const company = await prisma.company.findFirst({ where: { name: COMPANY_NAME } })
  if (!company) throw new Error(`Company "${COMPANY_NAME}" not found.`)

  type Result = { name: string; action: 'create' | 'skip'; reason?: string; amount?: number; category?: string }
  const results: Result[] = []

  for (const exp of EXPENSES) {
    const existing = await prisma.recurringExpense.findFirst({
      where: {
        companyId: company.id,
        name: { equals: exp.name, mode: 'insensitive' },
      },
      select: { id: true },
    })
    if (existing) {
      results.push({ name: exp.name, action: 'skip', reason: 'already exists' })
      continue
    }

    if (APPLY) {
      await prisma.recurringExpense.create({
        data: {
          companyId: company.id,
          name: exp.name,
          category: exp.category,
          monthlyAmount: exp.monthlyAmount,
          vendor: exp.vendor,
          paymentMethod: exp.paymentMethod,
          billingDay: 1,
          startDate: new Date(exp.startDate),
          endDate: exp.endDate ? new Date(exp.endDate) : null,
          isActive: exp.isActive,
          notes: exp.notes ?? null,
        },
      })
    }

    results.push({
      name: exp.name,
      action: 'create',
      amount: exp.monthlyAmount,
      category: exp.category,
    })
  }

  // Summary.
  console.log('=== EXPENSES ===')
  for (const r of results) {
    const tag = r.action === 'create' ? '[CREATE]' : '[SKIP  ]'
    const summary = r.action === 'create'
      ? ` $${(r.amount ?? 0).toLocaleString()}/mo  [${r.category}]`
      : r.reason ? ` — ${r.reason}` : ''
    console.log(`  ${tag} ${r.name}${summary}`)
  }

  const created = results.filter(r => r.action === 'create')
  const totalActive = created.reduce((s, r) => s + (r.amount ?? 0), 0)
  console.log('')
  console.log(`${APPLY ? 'Created' : 'Would create'}: ${created.length} expenses, ${results.length - created.length} skipped.`)
  console.log(`Aggregate monthly overhead from new entries: $${totalActive.toLocaleString()} ($${(totalActive * 12).toLocaleString()} annualized).`)
  if (!APPLY) console.log('Re-run with --apply to commit.')
}

main()
  .catch(err => { console.error('FAILED:', err); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
