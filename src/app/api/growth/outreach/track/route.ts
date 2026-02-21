import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Track email opens and clicks
 * Called by tracking pixels and link redirects
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const messageId = searchParams.get('msg')
    const type = searchParams.get('type') // 'open' or 'click'

    if (!messageId) {
      // Return 1x1 transparent pixel for opens
      return new NextResponse(
        Buffer.from(
          'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          'base64'
        ),
        {
          headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      )
    }

    // Update message tracking
    if (type === 'open') {
      await prisma.outreachMessage.updateMany({
        where: { id: messageId },
        data: {
          status: 'opened',
        },
      })

      // Also update prospect activity
      const message = await prisma.outreachMessage.findUnique({
        where: { id: messageId },
        select: { prospectId: true },
      })

      if (message?.prospectId) {
        await prisma.prospectActivity.updateMany({
          where: {
            prospectId: message.prospectId,
            type: 'email',
            sentAt: { not: null },
            openedAt: null,
          },
          data: {
            openedAt: new Date(),
          },
        })
      }
    } else if (type === 'click') {
      await prisma.outreachMessage.updateMany({
        where: { id: messageId },
        data: {
          status: 'clicked',
        },
      })

      // Update prospect activity
      const message = await prisma.outreachMessage.findUnique({
        where: { id: messageId },
        select: { prospectId: true },
      })

      if (message?.prospectId) {
        await prisma.prospectActivity.updateMany({
          where: {
            prospectId: message.prospectId,
            type: 'email',
            clickedAt: null,
          },
          data: {
            clickedAt: new Date(),
          },
        })
      }
    }

    // Return tracking pixel or redirect
    if (type === 'open') {
      return new NextResponse(
        Buffer.from(
          'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          'base64'
        ),
        {
          headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      )
    } else {
      // For clicks, redirect to original URL
      const url = searchParams.get('url') || 'https://urbansimple.net'
      return NextResponse.redirect(url)
    }
  } catch (error) {
    console.error('Error tracking:', error)
    // Still return pixel/redirect even on error
    return new NextResponse(
      Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      ),
      {
        headers: {
          'Content-Type': 'image/gif',
        },
      }
    )
  }
}
