import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

// POST /api/quote-request - Create quote request from public form
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      propertyType,
      kitchenCount,
      kitchenSquareFootages,
      diningAreaCount,
      diningAreaSquareFootages,
      bathroomCount,
      bathroomSquareFootages,
      nightlyEquipment,
      hoodsFilters,
      diningAreas,
      bathrooms,
      frequency,
      name,
      email,
      phone,
      company,
      message,
      estimate,
    } = body

    // Validate required fields
    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: 'Name, email, and phone are required' },
        { status: 400 }
      )
    }

    // Get the first company and branch (for public submissions)
    const companyRecord = await prisma.company.findFirst({
      where: { name: 'Urban Simple LLC' },
    })

    if (!companyRecord) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 500 }
      )
    }

    const branch = await prisma.branch.findFirst({
      where: {
        companyId: companyRecord.id,
        isActive: true,
      },
    })

    // Map property type to industry/business type
    const industryMap: Record<string, string> = {
      restaurant: 'restaurant',
      hotel: 'hospitality',
      commercial: 'restaurant',
      event: 'hospitality',
      spa: 'wellness',
      other: 'other',
    }

    const businessTypeMap: Record<string, string> = {
      restaurant: 'restaurant',
      hotel: 'hotel',
      commercial: 'commercial_kitchen',
      event: 'event_venue',
      spa: 'spa',
      other: 'other',
    }

    // Calculate estimated value from monthly estimate
    const estimatedValue = estimate?.monthly || null

    // Create prospect
    const prospect = await prisma.prospect.create({
      data: {
        companyId: companyRecord.id,
        branchId: branch?.id || null,
        companyName: company || 'Not provided',
        industry: propertyType ? industryMap[propertyType] || 'other' : null,
        businessType: propertyType ? businessTypeMap[propertyType] || 'other' : null,
        source: 'website',
        sourceDetail: 'Quote Request Form',
        status: 'new',
        priority: estimatedValue && estimatedValue > 5000 ? 'high' : 'medium',
        estimatedValue: estimatedValue ? estimatedValue : null,
        notes: `Quote Request Details:
- Property Type: ${propertyType || 'Not specified'}
- Kitchens: ${kitchenCount || 'Not specified'}
- Kitchen Square Footages: ${kitchenSquareFootages && kitchenSquareFootages.length > 0 ? kitchenSquareFootages.map((sqft: number) => sqft.toLocaleString()).join(', ') : 'Not specified'} sq ft
- Nightly Equipment Cleaning: ${nightlyEquipment ? 'Yes' : 'No'}
- Hoods & Filters: ${hoodsFilters ? 'Yes' : 'No'}
- Dining Areas: ${diningAreas ? 'Yes' : 'No'}${diningAreas && diningAreaCount ? ` (${diningAreaCount} areas, ${diningAreaSquareFootages && diningAreaSquareFootages.length > 0 ? diningAreaSquareFootages.map((sqft: number) => sqft.toLocaleString()).join(', ') : 'N/A'} sq ft)` : ''}
- Bathrooms: ${bathrooms ? 'Yes' : 'No'}${bathrooms && bathroomCount ? ` (${bathroomCount} bathrooms, ${bathroomSquareFootages && bathroomSquareFootages.length > 0 ? bathroomSquareFootages.map((sqft: number) => sqft.toLocaleString()).join(', ') : 'N/A'} sq ft)` : ''}
- Frequency: ${frequency || 'Not specified'}
- Estimated Nightly: ${estimate ? `$${estimate.nightly?.toLocaleString() || 'N/A'}` : 'Not calculated'}
- Estimated Weekly: ${estimate ? `$${estimate.weekly?.toLocaleString() || 'N/A'}` : 'Not calculated'}
- Estimated Monthly: ${estimate ? `$${estimate.monthly?.toLocaleString() || 'N/A'}` : 'Not calculated'}
${message ? `\nAdditional Notes:\n${message}` : ''}`,
        contacts: {
          create: {
            firstName: name.split(' ')[0] || name,
            lastName: name.split(' ').slice(1).join(' ') || '',
            email,
            phone,
            role: 'primary',
            isDecisionMaker: true,
          },
        },
      },
      include: {
        contacts: true,
      },
    })

    // Send email notification
    try {
      const emailSubject = `New Quote Request: ${company || name}`
      const emailBody = `
        <h2>New Quote Request Received</h2>
        <p><strong>Contact:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
        
        <h3>Property Details</h3>
        <ul>
          <li><strong>Type:</strong> ${propertyType || 'Not specified'}</li>
          <li><strong>Kitchens:</strong> ${kitchenCount || 'Not specified'}${kitchenSquareFootages && kitchenSquareFootages.length > 0 ? ` (${kitchenSquareFootages.map((sqft: number) => sqft.toLocaleString()).join(', ')} sq ft)` : ''}</li>
          <li><strong>Nightly Equipment:</strong> ${nightlyEquipment ? 'Yes' : 'No'}</li>
          <li><strong>Hoods & Filters:</strong> ${hoodsFilters ? 'Yes' : 'No'}</li>
          <li><strong>Dining Areas:</strong> ${diningAreas ? 'Yes' : 'No'}${diningAreas && diningAreaCount ? ` (${diningAreaCount} areas, ${diningAreaSquareFootages && diningAreaSquareFootages.length > 0 ? diningAreaSquareFootages.map((sqft: number) => sqft.toLocaleString()).join(', ') : 'N/A'} sq ft)` : ''}</li>
          <li><strong>Bathrooms:</strong> ${bathrooms ? 'Yes' : 'No'}${bathrooms && bathroomCount ? ` (${bathroomCount} bathrooms, ${bathroomSquareFootages && bathroomSquareFootages.length > 0 ? bathroomSquareFootages.map((sqft: number) => sqft.toLocaleString()).join(', ') : 'N/A'} sq ft)` : ''}</li>
          <li><strong>Frequency:</strong> ${frequency || 'Not specified'}</li>
        </ul>
        
        ${estimate ? `
        <h3>Estimated Costs</h3>
        <p><strong>Per Night:</strong> $${estimate.nightly?.toLocaleString() || 'N/A'}</p>
        <p><strong>Weekly:</strong> $${estimate.weekly?.toLocaleString() || 'N/A'}</p>
        <p><strong>Monthly:</strong> $${estimate.monthly?.toLocaleString() || 'N/A'}</p>
        ` : ''}
        
        ${message ? `<h3>Additional Notes</h3><p>${message}</p>` : ''}
        
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/growth/prospects/${prospect.id}">View Prospect in Dashboard</a></p>
      `

      const recipientEmail = process.env.QUOTE_REQUEST_EMAIL || companyRecord.email || 'info@urbansimple.net'

      const resend = new Resend(process.env.RESEND_API_KEY || '')
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: recipientEmail,
        subject: emailSubject,
        html: emailBody,
      })
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      prospectId: prospect.id,
      message: 'Quote request submitted successfully',
    })
  } catch (error: any) {
    console.error('Error creating quote request:', error)
    return NextResponse.json(
      { error: 'Failed to submit quote request', details: error.message },
      { status: 500 }
    )
  }
}

