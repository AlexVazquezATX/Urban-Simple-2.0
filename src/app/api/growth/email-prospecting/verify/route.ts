import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { verifyEmail } from '@/lib/services/email-verification'

// POST /api/growth/email-prospecting/verify - Verify an email address
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, prospectContactId } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const result = await verifyEmail(email)

    // Log API usage
    await prisma.emailProspectingLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        provider: 'abstract',
        endpoint: 'verify_email',
        queryParams: { email },
        creditsUsed: 1,
        responseTimeMs: Date.now() - startTime,
        success: true,
      },
    })

    // Update prospect contact record if ID provided
    if (prospectContactId) {
      await prisma.prospectContact.update({
        where: { id: prospectContactId },
        data: {
          emailVerified: result.is_valid,
          emailVerifiedAt: new Date(),
          emailVerificationStatus: result.is_valid
            ? 'valid'
            : result.is_catch_all
              ? 'risky'
              : 'invalid',
          emailConfidence: Math.round(result.quality_score),
          updatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Verification error:', error)

    // Try to log error
    try {
      const user = await getAuthenticatedUser(request)
      if (user) {
        await prisma.emailProspectingLog.create({
          data: {
            companyId: user.companyId,
            userId: user.id,
            provider: 'abstract',
            endpoint: 'verify_email',
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            responseTimeMs: Date.now() - startTime,
          },
        })
      }
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    )
  }
}
