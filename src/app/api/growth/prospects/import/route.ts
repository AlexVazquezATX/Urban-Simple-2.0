import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'

// POST /api/growth/prospects/import - Bulk import prospects
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { prospects } = body

    if (!Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json({ error: 'Prospects array is required' }, { status: 400 })
    }

    let created = 0
    let skipped = 0
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

            // Check for duplicates
            const existing = await prisma.prospect.findFirst({
              where: {
                companyId: user.companyId,
                companyName: {
                  equals: prospectData.companyName.trim(),
                  mode: 'insensitive',
                },
              },
            })

            if (existing) {
              skipped++
              return
            }

            // Prepare data
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
              tags: Array.isArray(prospectData.tags) ? prospectData.tags : [],
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

            await prisma.prospect.create({ data })
            created++
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

