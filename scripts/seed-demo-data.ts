// Seed demo data for development
// Run with: npx tsx scripts/seed-demo-data.ts

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding demo data...')

  // Get the admin user and company
  const user = await prisma.user.findFirst({
    where: { email: 'alex@urbansimple.net' },
  })

  if (!user) {
    throw new Error('Admin user not found. Run `npm run db:seed` first.')
  }

  const company = await prisma.company.findFirst()
  const branch = await prisma.branch.findFirst()

  if (!company || !branch) {
    throw new Error('Company or branch not found. Run `npm run db:seed` first.')
  }

  // Create demo clients
  const clients = [
    {
      name: 'Sunset Apartments',
      legalName: 'Sunset Apartments LLC',
      billingEmail: 'billing@sunsetapts.com',
      phone: '(512) 555-0101',
      status: 'active',
      notes: 'Residential property - 120 units',
    },
    {
      name: 'Downtown Plaza',
      legalName: 'Downtown Plaza Management Inc',
      billingEmail: 'accounts@downtownplaza.com',
      phone: '(512) 555-0102',
      status: 'active',
      notes: 'Commercial property - Office complex',
    },
    {
      name: 'Green Valley Condos',
      legalName: 'Green Valley HOA',
      billingEmail: 'admin@greenvalley.org',
      phone: '(512) 555-0103',
      status: 'active',
      notes: 'Residential condominiums - 85 units',
    },
    {
      name: 'Tech Tower',
      legalName: 'Tech Tower Properties LLC',
      billingEmail: 'finance@techtower.com',
      phone: '(512) 555-0104',
      status: 'active',
      notes: 'Mixed-use commercial building',
    },
    {
      name: 'Riverside Gardens',
      legalName: 'Riverside Gardens Community',
      billingEmail: 'manager@riversidegardens.com',
      phone: '(512) 555-0105',
      status: 'active',
      notes: 'Residential community - 200 units',
    },
  ]

  console.log('Creating clients...')
  const createdClients = []
  for (const clientData of clients) {
    const existing = await prisma.client.findFirst({
      where: { name: clientData.name },
    })

    if (!existing) {
      const client = await prisma.client.create({
        data: {
          ...clientData,
          companyId: company.id,
          branchId: branch.id,
        },
      })
      createdClients.push(client)
      console.log(`  ✅ Created client: ${client.name}`)
    } else {
      createdClients.push(existing)
      console.log(`  ℹ️  Client exists: ${existing.name}`)
    }
  }

  // Create locations for each client
  console.log('\nCreating locations...')
  for (const client of createdClients) {
    const locationName = `${client.name} Main Building`
    const existing = await prisma.location.findFirst({
      where: { clientId: client.id },
    })

    if (!existing) {
      await prisma.location.create({
        data: {
          clientId: client.id,
          branchId: branch.id,
          name: locationName,
          address: {
            street: `${Math.floor(Math.random() * 9000) + 1000} Main St`,
            city: 'Austin',
            state: 'TX',
            zipCode: `787${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`,
            country: 'USA',
          },
          isActive: true,
        },
      })
      console.log(`  ✅ Created location: ${locationName}`)
    } else {
      console.log(`  ℹ️  Location exists for ${client.name}`)
    }
  }

  // Skip service agreements for now - can add later

  // Create invoices
  console.log('\nCreating invoices...')
  const invoicePromises = []

  for (let i = 0; i < createdClients.length; i++) {
    const client = createdClients[i]

    // Create 2-4 invoices per client
    const invoiceCount = Math.floor(Math.random() * 3) + 2

    for (let j = 0; j < invoiceCount; j++) {
      const issueDate = new Date()
      issueDate.setMonth(issueDate.getMonth() - j) // Spread over last few months

      const dueDate = new Date(issueDate)
      dueDate.setDate(dueDate.getDate() + 30) // 30 days payment terms

      const amount = (Math.floor(Math.random() * 20) + 10) * 100 // $1000-$3000
      const paid = Math.random() > 0.3 ? amount * (Math.random() * 0.5 + 0.3) : 0 // 70% chance of partial payment
      const balanceDue = amount - paid

      // Determine status
      let status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue'
      if (balanceDue === 0) {
        status = 'paid'
      } else if (paid > 0) {
        status = 'partial'
      } else if (new Date() > dueDate) {
        status = 'overdue'
      } else {
        status = 'sent'
      }

      const invoiceNumber = `INV-${String(i + 1).padStart(3, '0')}-${String(j + 1).padStart(3, '0')}`

      const existing = await prisma.invoice.findFirst({
        where: { invoiceNumber },
      })

      if (!existing) {
        invoicePromises.push(
          prisma.invoice.create({
            data: {
              clientId: client.id,
              invoiceNumber,
              issueDate,
              dueDate,
              status,
              subtotal: amount,
              totalAmount: amount,
              amountPaid: paid,
              balanceDue,
              notes: `Monthly service invoice for ${client.name}`,
            },
          })
        )
      }
    }
  }

  const createdInvoices = await Promise.all(invoicePromises)
  console.log(`  ✅ Created ${createdInvoices.length} invoices`)

  // Create some payments for paid/partial invoices
  console.log('\nCreating payments...')
  const paidInvoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['paid', 'partial'] },
    },
    take: 10,
  })

  let paymentCount = 0
  for (const invoice of paidInvoices) {
    const existing = await prisma.payment.findFirst({
      where: { invoiceId: invoice.id },
    })

    if (!existing && invoice.amountPaid > 0) {
      await prisma.payment.create({
        data: {
          clientId: invoice.clientId,
          invoiceId: invoice.id,
          amount: invoice.amountPaid,
          paymentDate: new Date(invoice.issueDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days after invoice
          paymentMethod: ['CHECK', 'ACH', 'CREDIT_CARD'][Math.floor(Math.random() * 3)],
          referenceNumber: `PMT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          status: 'COMPLETED',
        },
      })
      paymentCount++
    }
  }
  console.log(`  ✅ Created ${paymentCount} payments`)

  console.log('\n✨ Demo data seeding complete!')
  console.log(`\nCreated:`)
  console.log(`  - ${createdClients.length} clients`)
  console.log(`  - ${createdClients.length} locations`)
  console.log(`  - ${createdInvoices.length} invoices`)
  console.log(`  - ${paymentCount} payments`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
