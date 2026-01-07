import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateDailyBriefing } from '@/features/pulse/lib/pulse-generator'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max for briefing generation

/**
 * GET /api/cron/pulse-generate
 * Cron job endpoint to generate daily briefings for all SUPER_ADMIN users
 *
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/pulse-generate",
 *     "schedule": "0 11 * * *"  // 6 AM CST (11 UTC)
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, verify it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Cron job called without valid authorization')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Starting daily Pulse briefing generation...')

    // Get all SUPER_ADMIN users who have active topics
    const users = await prisma.user.findMany({
      where: {
        role: 'SUPER_ADMIN',
        isActive: true,
        pulseTopics: {
          some: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        email: true,
        _count: {
          select: {
            pulseTopics: {
              where: { isActive: true },
            },
          },
        },
      },
    })

    console.log(`Found ${users.length} users with active Pulse topics`)

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users with active Pulse topics',
        usersProcessed: 0,
      })
    }

    const results: {
      userId: string
      email: string
      success: boolean
      itemsGenerated?: number
      errors?: string[]
    }[] = []

    // Generate briefings for each user
    for (const user of users) {
      console.log(`Generating briefing for ${user.email} (${user._count.pulseTopics} topics)...`)

      try {
        const result = await generateDailyBriefing({
          userId: user.id,
          forceRegenerate: false, // Don't regenerate if already exists
        })

        results.push({
          userId: user.id,
          email: user.email,
          success: result.success,
          itemsGenerated: result.itemsGenerated,
          errors: result.errors.length > 0 ? result.errors : undefined,
        })

        console.log(
          `  ${result.success ? 'SUCCESS' : 'FAILED'}: ${result.itemsGenerated} items generated` +
          (result.errors.length > 0 ? ` (${result.errors.length} errors)` : '')
        )
      } catch (error: any) {
        console.error(`  ERROR for ${user.email}:`, error.message)
        results.push({
          userId: user.id,
          email: user.email,
          success: false,
          errors: [error.message],
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    console.log(`Pulse generation complete: ${successCount} success, ${failCount} failed`)

    return NextResponse.json({
      success: true,
      message: `Generated briefings for ${successCount}/${users.length} users`,
      usersProcessed: users.length,
      successCount,
      failCount,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/pulse-generate
 * Manual trigger endpoint (useful for testing)
 */
export async function POST(request: NextRequest) {
  // Same logic as GET for manual triggers
  return GET(request)
}
