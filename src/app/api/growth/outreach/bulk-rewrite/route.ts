import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'

/**
 * POST /api/growth/outreach/bulk-rewrite
 * Bulk update message subjects and bodies.
 * Payload: { messages: [{ id, subject?, body }] }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages } = await request.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages array is required — each item needs { id, body } and optionally { subject }' },
        { status: 400 }
      )
    }

    // Validate all IDs belong to user's company and are still pending
    const messageIds = messages.map((m: any) => m.id)
    const existing = await prisma.outreachMessage.findMany({
      where: {
        id: { in: messageIds },
        status: 'pending',
        prospect: { companyId: user.companyId },
      },
      select: { id: true },
    })

    const validIds = new Set(existing.map(m => m.id))

    let updated = 0
    let skipped = 0
    const errors: string[] = []

    for (const msg of messages) {
      if (!msg.id || typeof msg.id !== 'string') {
        skipped++
        errors.push('Missing or invalid message ID')
        continue
      }

      if (!validIds.has(msg.id)) {
        skipped++
        errors.push(`${msg.id}: not found, not pending, or not in your company`)
        continue
      }

      const data: any = {}
      if (msg.body !== undefined) {
        if (typeof msg.body !== 'string' || msg.body.trim().length === 0) {
          skipped++
          errors.push(`${msg.id}: body cannot be empty`)
          continue
        }
        data.body = msg.body.trim()
      }
      if (msg.subject !== undefined) {
        data.subject = typeof msg.subject === 'string' ? msg.subject.trim() || null : null
      }

      if (Object.keys(data).length === 0) {
        skipped++
        errors.push(`${msg.id}: no fields to update`)
        continue
      }

      await prisma.outreachMessage.update({
        where: { id: msg.id },
        data,
      })
      updated++
    }

    return NextResponse.json({
      updated,
      skipped,
      total: messages.length,
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
    })
  } catch (error) {
    console.error('Error in bulk rewrite:', error)
    return NextResponse.json(
      { error: 'Failed to bulk rewrite messages' },
      { status: 500 }
    )
  }
}
