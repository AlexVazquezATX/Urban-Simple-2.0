import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

// POST /api/walkthrough-request - Create walkthrough request from public form
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      phone,
      company,
      propertyType,
      message,
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
      'Restaurant': 'restaurant',
      'Hotel & Resort': 'hospitality',
      'Commercial Kitchen': 'restaurant',
      'Event Venue': 'hospitality',
      'Spa & Wellness': 'wellness',
      'Other': 'other',
    }

    const businessTypeMap: Record<string, string> = {
      'Restaurant': 'restaurant',
      'Hotel & Resort': 'hotel',
      'Commercial Kitchen': 'commercial_kitchen',
      'Event Venue': 'event_venue',
      'Spa & Wellness': 'spa',
      'Other': 'other',
    }

    // Create prospect
    const prospect = await prisma.prospect.create({
      data: {
        companyId: companyRecord.id,
        branchId: branch?.id || null,
        companyName: company || 'Not provided',
        industry: propertyType ? industryMap[propertyType] || 'other' : null,
        businessType: propertyType ? businessTypeMap[propertyType] || 'other' : null,
        source: 'website',
        sourceDetail: 'Walkthrough Request Form',
        status: 'new',
        priority: 'high', // Walkthrough requests are high priority
        notes: `Walkthrough Request:
- Property Type: ${propertyType || 'Not specified'}
${message ? `\nDetails:\n${message}` : ''}`,
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
      const emailSubject = `New Walkthrough Request: ${company || name}`
      const emailBody = `
        <h2>New Walkthrough Request Received</h2>
        <p><strong>Contact:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
        ${propertyType ? `<p><strong>Property Type:</strong> ${propertyType}</p>` : ''}
        
        ${message ? `<h3>Additional Details</h3><p>${message}</p>` : ''}
        
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
      message: 'Walkthrough request submitted successfully',
    })
  } catch (error: any) {
    console.error('Error creating walkthrough request:', error)
    return NextResponse.json(
      { error: 'Failed to submit walkthrough request', details: error.message },
      { status: 500 }
    )
  }
}

