import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/admin/analytics/test
 * Simple test endpoint to diagnose auth and basic data access
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({
        error: 'No user found',
        auth: 'failed'
      }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        hasCompany: !!user.company,
      },
      message: 'Auth working correctly!'
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Test endpoint failed',
      details: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}
