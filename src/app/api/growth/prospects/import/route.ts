import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { enrollProspectInSequence } from '@/lib/services/outreach-enroll'

// POST /api/growth/prospects/import - Bulk import prospects
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { prospects, applyFreshTag, autoEnroll } = body as {
      prospects: any[]
      applyFreshTag?: boolean
      autoEnroll?: boolean
    }

    if (!Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json({ error: 'Prospects array is required' }, { status: 400 })
    }

    // Fetch the company's default autopilot template + autopilot settings once.
    // Only needed if autoEnroll is requested.
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        id: true,
        defaultAutopilotCampaignId: true,
        autopilotSendHourStart: true,
        autopilotSendHourEnd: true,
        autopilotSendDaysOfWeek: true,
        branches: { select: { timezone: true }, take: 1 },
      },
    })

    const autopilotTemplate =
      autoEnroll && company?.defaultAutopilotCampaignId
        ? await prisma.outreachCampaign.findFirst({
            where: {
              id: company.defaultAutopilotCampaignId,
              companyId: user.companyId,
              prospectId: null,
              autopilot: true,
            },
            include: {
              messages: { orderBy: { step: 'asc' } },
            },
          })
        : null

    const companyAutopilot = company
      ? {
          id: company.id,
          timezone: company.branches[0]?.timezone || 'America/Chicago',
          autopilotSendHourStart: company.autopilotSendHourStart,
          autopilotSendHourEnd: company.autopilotSendHourEnd,
          autopilotSendDaysOfWeek: company.autopilotSendDaysOfWeek,
        }
      : null

    let created = 0
    let skipped = 0
    let contactsAdded = 0
    let enrolled = 0
    const errors: string[] = []

    // Process prospects in batches to avoid overwhelming the database
    const batchSize = 50
    for (let i = 0; i < prospects.length; i += batchSize) {
      const batch = prospects.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (prospectData: any, index: number) => {
          try {
            // Validate required fields
            if (!prospectData.companyName || !prospectData.companyName.trim()) {
              skipped++
              errors.push(`Row ${i + index + 1}: Missing company name`)
              return
            }

            // Check for duplicates (ignore soft-deleted prospects so they can be re-imported)
            const existing = await prisma.prospect.findFirst({
              where: {
                companyId: user.companyId,
                deletedAt: null,
                companyName: {
                  equals: prospectData.companyName.trim(),
                  mode: 'insensitive',
                },
              },
              include: { contacts: { select: { email: true } } },
            })

            if (existing) {
              // Duplicate company — add new contacts if provided
              if (prospectData.contacts && prospectData.contacts.length > 0) {
                const existingEmails = new Set(
                  existing.contacts.map(c => c.email?.toLowerCase()).filter(Boolean)
                )
                for (const contact of prospectData.contacts) {
                  const email = contact.email?.trim()?.toLowerCase()
                  // Skip if no identifying info or email already exists
                  if (!contact.firstName?.trim() && !email) continue
                  if (email && existingEmails.has(email)) continue

                  await prisma.prospectContact.create({
                    data: {
                      prospectId: existing.id,
                      firstName: contact.firstName?.trim() || '',
                      lastName: contact.lastName?.trim() || '',
                      email: contact.email?.trim() || null,
                      phone: contact.phone?.trim() || null,
                      title: contact.title?.trim() || null,
                      role: contact.role || 'primary',
                      isDecisionMaker: contact.isDecisionMaker || false,
                      notes: contact.notes?.trim() || null,
                    },
                  })
                  contactsAdded++
                }
              }
              skipped++
              return
            }

            // Prepare data
            const incomingTags = Array.isArray(prospectData.tags) ? prospectData.tags : []
            const tags = applyFreshTag && !incomingTags.includes('fresh')
              ? [...incomingTags, 'fresh']
              : incomingTags

            const data: any = {
              companyId: user.companyId,
              branchId: prospectData.branchId || user.branchId,
              assignedToId: prospectData.assignedToId || null,
              companyName: prospectData.companyName.trim(),
              legalName: prospectData.legalName?.trim() || null,
              industry: prospectData.industry?.trim() || null,
              businessType: prospectData.businessType?.trim() || null,
              address: prospectData.address || null,
              website: prospectData.website?.trim() || null,
              phone: prospectData.phone?.trim() || null,
              estimatedSize: prospectData.estimatedSize?.trim() || null,
              employeeCount: prospectData.employeeCount ? parseInt(prospectData.employeeCount) : null,
              annualRevenue: prospectData.annualRevenue ? parseFloat(prospectData.annualRevenue) : null,
              priceLevel: prospectData.priceLevel?.trim() || null,
              status: prospectData.status || 'prospect',
              priority: prospectData.priority || 'medium',
              estimatedValue: prospectData.estimatedValue ? parseFloat(prospectData.estimatedValue) : null,
              source: prospectData.source || 'csv_import',
              sourceDetail: prospectData.sourceDetail?.trim() || null,
              tags,
              notes: prospectData.notes?.trim() || null,
              discoveryData: prospectData.discoveryData || null,
            }

            // Create prospect with contacts if provided
            if (prospectData.contacts && prospectData.contacts.length > 0) {
              data.contacts = {
                create: prospectData.contacts.map((contact: any) => ({
                  firstName: contact.firstName?.trim() || '',
                  lastName: contact.lastName?.trim() || '',
                  email: contact.email?.trim() || null,
                  phone: contact.phone?.trim() || null,
                  title: contact.title?.trim() || null,
                  role: contact.role || 'primary',
                  isDecisionMaker: contact.isDecisionMaker || false,
                  notes: contact.notes?.trim() || null,
                })),
              }
            }

            const createdProspect = await prisma.prospect.create({
              data,
              include: {
                contacts: {
                  take: 1,
                  select: {
                    firstName: true,
                    lastName: true,
                    title: true,
                    email: true,
                  },
                },
              },
            })
            created++

            // Auto-enroll in default autopilot sequence if requested AND the
            // prospect has at least one contact with an email address.
            if (autopilotTemplate && companyAutopilot) {
              const hasEmail = createdProspect.contacts.some(c => c.email && c.email.trim())
              if (hasEmail) {
                try {
                  const result = await enrollProspectInSequence({
                    template: {
                      id: autopilotTemplate.id,
                      name: autopilotTemplate.name,
                      description: autopilotTemplate.description,
                      autopilot: autopilotTemplate.autopilot,
                      messages: autopilotTemplate.messages.map(m => ({
                        step: m.step,
                        delayDays: m.delayDays,
                        channel: m.channel,
                        subject: m.subject,
                        body: m.body,
                        isAiGenerated: m.isAiGenerated,
                      })),
                    },
                    prospect: {
                      id: createdProspect.id,
                      companyName: createdProspect.companyName,
                      address: createdProspect.address,
                      contacts: createdProspect.contacts,
                    },
                    companyId: user.companyId,
                    userId: user.id,
                    company: companyAutopilot,
                  })
                  if (!('skipped' in result)) enrolled++
                } catch (enrollErr: any) {
                  console.error(
                    `[IMPORT] Auto-enroll failed for ${createdProspect.companyName}:`,
                    enrollErr
                  )
                }
              }
            }
          } catch (error: any) {
            console.error(`Error importing prospect ${i + index + 1}:`, error)
            skipped++
            errors.push(`Row ${i + index + 1}: ${error.message || 'Unknown error'}`)
          }
        })
      )
    }

    return NextResponse.json({
      created,
      skipped,
      contactsAdded,
      enrolled,
      total: prospects.length,
      errors: errors.slice(0, 10), // Return first 10 errors
    })
  } catch (error) {
    console.error('Error importing prospects:', error)
    return NextResponse.json(
      { error: 'Failed to import prospects' },
      { status: 500 }
    )
  }
}

