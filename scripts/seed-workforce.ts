/**
 * Workforce Seed Script
 *
 * Creates all real associates and their account assignments.
 * Cleans up test/dummy associates first.
 *
 * Usage: npx tsx scripts/seed-workforce.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Starting workforce seed...\n')

  // 1. Find company and branch
  const company = await prisma.company.findFirst()
  if (!company) {
    throw new Error('No company found. Run the main seed first.')
  }
  console.log(`✓ Company: ${company.name} (${company.id})`)

  const branch = await prisma.branch.findFirst({ where: { companyId: company.id } })
  if (!branch) {
    throw new Error('No branch found.')
  }
  console.log(`✓ Branch: ${branch.name} (${branch.id})\n`)

  // 2. Delete dummy/test associates and their assignments
  console.log('🧹 Cleaning up test associates...')
  const testEmails = [
    'mike.chen@urbansimple.com',
    'emily.rodriguez@urbansimple.com',
    'james.wilson@urbansimple.com',
    'sarah.johnson@urbansimple.com',
  ]

  // Delete assignments for test users
  const testUsers = await prisma.user.findMany({
    where: { email: { in: testEmails } },
    select: { id: true, email: true },
  })

  for (const tu of testUsers) {
    await prisma.locationAssignment.deleteMany({ where: { userId: tu.id } })
    await prisma.associate.deleteMany({ where: { userId: tu.id } })
    await prisma.user.delete({ where: { id: tu.id } })
    console.log(`  Deleted test user: ${tu.email}`)
  }

  // 3. Helper to find or create a client
  async function findOrCreateClient(name: string) {
    let client = await prisma.client.findFirst({
      where: { name, branchId: branch!.id },
    })
    if (!client) {
      client = await prisma.client.create({
        data: {
          companyId: company!.id,
          branchId: branch!.id,
          name,
          status: 'active',
        },
      })
      console.log(`  + Created client: ${name}`)
    }
    return client
  }

  // 4. Helper to find or create a location under a client
  async function findOrCreateLocation(clientId: string, name: string) {
    let location = await prisma.location.findFirst({
      where: { clientId, name, branchId: branch!.id },
    })
    if (!location) {
      location = await prisma.location.create({
        data: {
          clientId,
          branchId: branch!.id,
          name,
          address: { street: '', city: 'Austin', state: 'TX', zip: '' },
          isActive: true,
        },
      })
      console.log(`    + Created location: ${name}`)
    }
    return location
  }

  // 5. Helper to create an associate user
  async function createAssociate(firstName: string, lastName: string, email: string) {
    // Check if already exists
    let user = await prisma.user.findFirst({
      where: { email },
    })
    if (user) {
      console.log(`  ~ Associate exists: ${firstName} ${lastName} (${email})`)
      return user
    }

    user = await prisma.user.create({
      data: {
        companyId: company!.id,
        branchId: branch!.id,
        email,
        firstName,
        lastName,
        role: 'ASSOCIATE',
        isActive: true,
      },
    })

    // Create Associate record
    await prisma.associate.create({
      data: {
        userId: user.id,
        onboardingStatus: 'completed',
      },
    })

    console.log(`  + Created associate: ${firstName} ${lastName}`)
    return user
  }

  // 6. Helper to create an assignment (deletes existing active one first to avoid conflicts)
  async function createAssignment(
    userId: string,
    locationId: string,
    monthlyPay: number,
    label?: string
  ) {
    // Deactivate any existing active assignment for this user+location
    await prisma.locationAssignment.updateMany({
      where: { userId, locationId, isActive: true },
      data: { isActive: false },
    })

    const assignment = await prisma.locationAssignment.create({
      data: {
        userId,
        locationId,
        monthlyPay,
        startDate: new Date(),
        isActive: true,
      },
    })
    console.log(`      → ${label || 'Assignment'}: $${monthlyPay.toFixed(2)}`)
    return assignment
  }

  // ================================================
  // CREATE ALL ASSOCIATES AND THEIR ASSIGNMENTS
  // ================================================

  console.log('\n📋 Creating associates and assignments...\n')

  // --- Anibal Wilfredo Mejia ---
  {
    const user = await createAssociate('Anibal Wilfredo', 'Mejia', 'anibal.mejia@urbansimple.net')
    const carolineClient = await findOrCreateClient('Caroline')
    const carolineLoc = await findOrCreateLocation(carolineClient.id, 'Caroline')
    await createAssignment(user.id, carolineLoc.id, 1000, 'Caroline')

    const blindsClient = await findOrCreateClient('Blinds Cleaning')
    const blindsLoc = await findOrCreateLocation(blindsClient.id, 'Blinds')
    await createAssignment(user.id, blindsLoc.id, 50, 'Blinds')

    const lorenClient = await findOrCreateClient('The Loren Hotel')
    const lorenLoc = await findOrCreateLocation(lorenClient.id, 'The Loren Hotel')
    await createAssignment(user.id, lorenLoc.id, 1400, 'The Loren Hotel')

    const metaClient = await findOrCreateClient('Meta')
    const meta18Loc = await findOrCreateLocation(metaClient.id, '18th Floor')
    await createAssignment(user.id, meta18Loc.id, 450, 'Meta 18th Floor')

    const qcClient = await findOrCreateClient('Quarterly Cleaning')
    const qcLoc = await findOrCreateLocation(qcClient.id, 'Quarterly Cleaning Goal')
    await createAssignment(user.id, qcLoc.id, 75, 'Quarterly Cleaning Goal')
  }

  // --- Areli Bautista ---
  {
    const user = await createAssociate('Areli', 'Bautista', 'areli.bautista@urbansimple.net')
    const tarkaClient = await findOrCreateClient('Tarka')
    const tarkaAnderson = await findOrCreateLocation(tarkaClient.id, 'Anderson')
    await createAssignment(user.id, tarkaAnderson.id, 600, 'Tarka Anderson')
  }

  // --- Dalia Torres ---
  {
    const user = await createAssociate('Dalia', 'Torres', 'dalia.torres@urbansimple.net')
    const hsbClient = await findOrCreateClient('Horseshoe Bay Resort')
    const hsbLoc = await findOrCreateLocation(hsbClient.id, 'Resort')
    await createAssignment(user.id, hsbLoc.id, 2100, 'Horseshoe Bay Resort')

    const gasClient = await findOrCreateClient('Reimbursements')
    const gasLoc = await findOrCreateLocation(gasClient.id, 'Gas Reimbursement - Dalia')
    await createAssignment(user.id, gasLoc.id, 50, 'Gas Reimbursement')
  }

  // --- Eva Pineda ---
  {
    const user = await createAssociate('Eva', 'Pineda', 'eva.pineda@urbansimple.net')
    const blackBbq = await findOrCreateClient('Black BBQ')
    const blackBbqLoc = await findOrCreateLocation(blackBbq.id, 'Black BBQ')
    await createAssignment(user.id, blackBbqLoc.id, 450, 'Black BBQ')

    const swifts = await findOrCreateClient("Swift's Attic")
    const swiftsLoc = await findOrCreateLocation(swifts.id, "Swift's Attic")
    await createAssignment(user.id, swiftsLoc.id, 200, "Swift's Attic")

    const barHacienda = await findOrCreateClient('Bar Hacienda')
    const barHaciendaLoc = await findOrCreateLocation(barHacienda.id, 'Bar Hacienda')
    await createAssignment(user.id, barHaciendaLoc.id, 300, 'Bar Hacienda')

    const melde = await findOrCreateClient('MELDE Construction')
    const meldeLoc = await findOrCreateLocation(melde.id, 'MELDE Construction')
    await createAssignment(user.id, meldeLoc.id, 125, 'MELDE Construction')

    const barFino = await findOrCreateClient('Bar Fino')
    const barFinoLoc = await findOrCreateLocation(barFino.id, 'Bar Fino')
    await createAssignment(user.id, barFinoLoc.id, 250, 'Bar Fino')

    const barFinoExtra = await findOrCreateLocation(barFino.id, 'Bar Fino - Extra Days (March)')
    await createAssignment(user.id, barFinoExtra.id, 100, '2 Extra Days at Bar Fino')
  }

  // --- Josue Lara ---
  {
    const user = await createAssociate('Josue', 'Lara', 'josue.lara@urbansimple.net')
    const parlay = await findOrCreateClient('Parlay')
    const parlayLoc = await findOrCreateLocation(parlay.id, 'Parlay')
    await createAssignment(user.id, parlayLoc.id, 437.50, 'Parlay')
  }

  // --- Javier Pena ---
  {
    const user = await createAssociate('Javier', 'Pena', 'javier.pena@urbansimple.net')
    const tarkaClient = await findOrCreateClient('Tarka')
    const tarkaRR = await findOrCreateLocation(tarkaClient.id, 'Round Rock')
    await createAssignment(user.id, tarkaRR.id, 600, 'Tarka Round Rock')
  }

  // --- Jhon Martinez Alvarez ---
  {
    const user = await createAssociate('Jhon', 'Martinez Alvarez', 'jhon.martinez@urbansimple.net')
    const hsbClient = await findOrCreateClient('Horseshoe Bay Resort')
    const hsbLoc = await findOrCreateLocation(hsbClient.id, 'Resort')
    await createAssignment(user.id, hsbLoc.id, 2100, 'Horseshoe Bay Resort')

    const gasClient = await findOrCreateClient('Reimbursements')
    const gasLoc = await findOrCreateLocation(gasClient.id, 'Gas Reimbursement - Jhon')
    await createAssignment(user.id, gasLoc.id, 50, 'Gas Reimbursement')
  }

  // --- Krisbel Martinez ---
  {
    const user = await createAssociate('Krisbel', 'Martinez', 'krisbel.martinez@urbansimple.net')
    const suites71x = await findOrCreateClient('71X Suites')
    const suites71xLoc = await findOrCreateLocation(suites71x.id, '71X Suites')
    await createAssignment(user.id, suites71xLoc.id, 300, '71X Suites')

    const hsbClient = await findOrCreateClient('Horseshoe Bay Resort')
    const hsbLoc = await findOrCreateLocation(hsbClient.id, 'Resort')
    await createAssignment(user.id, hsbLoc.id, 900, 'Horseshoe Bay')

    const gasClient = await findOrCreateClient('Reimbursements')
    const gasLoc = await findOrCreateLocation(gasClient.id, 'Reimbursement - Krisbel')
    await createAssignment(user.id, gasLoc.id, 50, 'Reimbursement')
  }

  // --- Maria Angelica Gonzalez ---
  {
    const user = await createAssociate('Maria Angelica', 'Gonzalez', 'maria.gonzalez@urbansimple.net')
    const hsbClient = await findOrCreateClient('Horseshoe Bay Resort')
    const hsbLoc = await findOrCreateLocation(hsbClient.id, 'Resort')
    await createAssignment(user.id, hsbLoc.id, 2100, 'Horseshoe Bay Resort')

    const gasClient = await findOrCreateClient('Reimbursements')
    const gasLoc = await findOrCreateLocation(gasClient.id, 'Gas Reimbursement - Maria')
    await createAssignment(user.id, gasLoc.id, 50, 'Gas Reimbursement')
  }

  // --- Marianny Rodriguez ---
  {
    const user = await createAssociate('Marianny', 'Rodriguez', 'marianny.rodriguez@urbansimple.net')
    const hsbClient = await findOrCreateClient('Horseshoe Bay Resort')
    const hsbLoc = await findOrCreateLocation(hsbClient.id, 'Resort')
    await createAssignment(user.id, hsbLoc.id, 2100, 'Horseshoe Bay')

    const gasClient = await findOrCreateClient('Reimbursements')
    const gasLoc = await findOrCreateLocation(gasClient.id, 'Reimbursement - Marianny')
    await createAssignment(user.id, gasLoc.id, 50, 'Reimbursement')
  }

  // --- Maryoris Vasquez ---
  {
    const user = await createAssociate('Maryoris', 'Vasquez', 'maryoris.vasquez@urbansimple.net')
    const metaClient = await findOrCreateClient('Meta')
    const meta18Loc = await findOrCreateLocation(metaClient.id, '18th Floor')
    await createAssignment(user.id, meta18Loc.id, 900, 'Facebook 18th Floor')
  }

  // --- Rosario Camacho ---
  {
    const user = await createAssociate('Rosario', 'Camacho', 'rosario.camacho@urbansimple.net')
    const usClient = await findOrCreateClient('Urban Simple')
    const usLoc = await findOrCreateLocation(usClient.id, 'Urban Simple Offices')
    await createAssignment(user.id, usLoc.id, 280, 'Urban Simple Offices')
  }

  // --- Jose Luis Torres ---
  {
    const user = await createAssociate('Jose Luis', 'Torres', 'joseluis.torres@urbansimple.net')
    const hsbClient = await findOrCreateClient('Horseshoe Bay Resort')
    const hsbLoc = await findOrCreateLocation(hsbClient.id, 'Resort')
    await createAssignment(user.id, hsbLoc.id, 2100, 'Horseshoe Bay Resort')

    const gasClient = await findOrCreateClient('Reimbursements')
    const gasLoc = await findOrCreateLocation(gasClient.id, 'Gas Reimbursement - Jose Luis')
    await createAssignment(user.id, gasLoc.id, 50, 'Gas Reimbursement')
  }

  // --- Franchesca Machado ---
  {
    const user = await createAssociate('Franchesca', 'Machado', 'franchesca.machado@urbansimple.net')
    const nectarine = await findOrCreateClient('Nectarine')
    const nectarineLoc = await findOrCreateLocation(nectarine.id, 'Nectarine')
    await createAssignment(user.id, nectarineLoc.id, 833.34, 'Nectarine')

    const tarkaClient = await findOrCreateClient('Tarka')
    const tarkaBrodie = await findOrCreateLocation(tarkaClient.id, 'Brodie')
    await createAssignment(user.id, tarkaBrodie.id, 700, 'Tarka Brodie')

    const wuChow = await findOrCreateClient('Wu Chow')
    const wuChowLoc = await findOrCreateLocation(wuChow.id, 'Wu Chow')
    await createAssignment(user.id, wuChowLoc.id, 400, 'Wu Chow')

    const plate = await findOrCreateClient('Plate by Dzintra')
    const plateLoc = await findOrCreateLocation(plate.id, 'Plate by Dzintra')
    await createAssignment(user.id, plateLoc.id, 500, 'Plate by Dzintra')

    const hnt = await findOrCreateClient('Here Nor There')
    const hntLoc = await findOrCreateLocation(hnt.id, 'Here Nor There')
    await createAssignment(user.id, hntLoc.id, 825, 'Here Nor There')

    const hntDeep = await findOrCreateLocation(hnt.id, 'Here Nor There - Deep Clean')
    await createAssignment(user.id, hntDeep.id, 100, 'Limpieza Profunda Here Nor There')
  }

  // --- Ydelfonso Castillo Montes ---
  {
    const user = await createAssociate('Ydelfonso', 'Castillo Montes', 'ydelfonso.castillo@urbansimple.net')
    const hsbClient = await findOrCreateClient('Horseshoe Bay Resort')
    const hsbLoc = await findOrCreateLocation(hsbClient.id, 'Resort')
    await createAssignment(user.id, hsbLoc.id, 2100, 'Horseshoe Bay Resort')

    const gasClient = await findOrCreateClient('Reimbursements')
    const gasLoc = await findOrCreateLocation(gasClient.id, 'Gas Reimbursement - Ydelfonso')
    await createAssignment(user.id, gasLoc.id, 50, 'Gas Reimbursement')
  }

  // --- Yoifranger Oliveros ---
  {
    const user = await createAssociate('Yoifranger', 'Oliveros', 'yoifranger.oliveros@urbansimple.net')
    const metaClient = await findOrCreateClient('Meta')
    const meta3rdLoc = await findOrCreateLocation(metaClient.id, '3rd & Shoal - 14th Floor')
    await createAssignment(user.id, meta3rdLoc.id, 850, 'Facebook 3rd & Shoal 14th Floor')

    const meta22Loc = await findOrCreateLocation(metaClient.id, '3rd & Shoal - 22nd Floor')
    await createAssignment(user.id, meta22Loc.id, 250, '22nd Floor')

    const capitalGrille = await findOrCreateClient('Capital Grille')
    const capitalBoh = await findOrCreateLocation(capitalGrille.id, 'BOH')
    await createAssignment(user.id, capitalBoh.id, 1100, 'Capital Grille (BOH)')

    const supervisionClient = await findOrCreateClient('Supervision')
    const supervisionLoc = await findOrCreateLocation(supervisionClient.id, 'Supervision')
    await createAssignment(user.id, supervisionLoc.id, 500, 'Supervision')

    const capitalDeep = await findOrCreateLocation(capitalGrille.id, 'Deep Cleaning')
    await createAssignment(user.id, capitalDeep.id, 90, 'Deep Cleaning (Capital)')

    const qcClient = await findOrCreateClient('Quarterly Cleaning')
    const qcMeta = await findOrCreateLocation(qcClient.id, 'Meta 14th & 22nd Floors')
    await createAssignment(user.id, qcMeta.id, 240, 'Quarterly Cleaning - Meta Floors')
  }

  // --- Gaimary Herrera ---
  {
    const user = await createAssociate('Gaimary', 'Herrera', 'gaimary.herrera@urbansimple.net')
    const metaClient = await findOrCreateClient('Meta')
    const meta14Loc = await findOrCreateLocation(metaClient.id, '14th Floor')
    await createAssignment(user.id, meta14Loc.id, 850, 'Facebook 14th Floor')

    const meta22Loc = await findOrCreateLocation(metaClient.id, '22nd Floor')
    await createAssignment(user.id, meta22Loc.id, 250, '22nd Floor')

    const qcClient = await findOrCreateClient('Quarterly Cleaning')
    const qc22 = await findOrCreateLocation(qcClient.id, '22nd Floor Quarterly')
    await createAssignment(user.id, qc22.id, 200, 'Quarterly Cleaning - 22nd Floor')

    const lorenClient = await findOrCreateClient('The Loren Hotel')
    const lorenLoc = await findOrCreateLocation(lorenClient.id, 'The Loren Hotel')
    await createAssignment(user.id, lorenLoc.id, 1000, 'The Loren Hotel')

    const capitalGrille = await findOrCreateClient('Capital Grille')
    const capitalDeep = await findOrCreateLocation(capitalGrille.id, 'Deep Cleaning')
    await createAssignment(user.id, capitalDeep.id, 90, 'Deep Cleaning (Capital)')
  }

  // --- Yuliza Perez ---
  {
    const user = await createAssociate('Yuliza', 'Perez', 'yuliza.perez@urbansimple.net')
    const tarkaClient = await findOrCreateClient('Tarka')
    const tarkaLakeline = await findOrCreateLocation(tarkaClient.id, 'Lakeline')
    await createAssignment(user.id, tarkaLakeline.id, 600, 'Tarka Lakeline')

    const capitalGrille = await findOrCreateClient('Capital Grille')
    const capitalFoh = await findOrCreateLocation(capitalGrille.id, 'FOH')
    await createAssignment(user.id, capitalFoh.id, 900, 'Capital Grille (FOH)')

    const balcones = await findOrCreateClient('Balcones Dr')
    const balconesLoc = await findOrCreateLocation(balcones.id, 'Balcones Dr')
    await createAssignment(user.id, balconesLoc.id, 600, 'Balcones Dr')

    const capitalDeep = await findOrCreateLocation(capitalGrille.id, 'Deep Cleaning')
    await createAssignment(user.id, capitalDeep.id, 90, 'Deep Cleaning (Capital)')
  }

  // ================================================
  // SUMMARY
  // ================================================

  const totalAssociates = await prisma.user.count({
    where: { companyId: company.id, role: 'ASSOCIATE', isActive: true },
  })
  const totalAssignments = await prisma.locationAssignment.count({
    where: { isActive: true },
  })

  console.log('\n✅ Workforce seed complete!')
  console.log(`   ${totalAssociates} active associates`)
  console.log(`   ${totalAssignments} active assignments`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
