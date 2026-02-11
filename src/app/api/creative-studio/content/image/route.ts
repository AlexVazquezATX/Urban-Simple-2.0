/**
 * Image serving endpoint for Creative Studio content
 *
 * Serves generated images directly as binary with proper caching headers.
 * This avoids sending multi-MB base64 strings in JSON list responses.
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse(null, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return new NextResponse(null, { status: 400 })
    }

    const content = await prisma.restaurantStudioContent.findUnique({
      where: { id },
      select: {
        companyId: true,
        generatedImageUrl: true,
      },
    })

    if (!content || content.companyId !== user.companyId) {
      return new NextResponse(null, { status: 404 })
    }

    if (!content.generatedImageUrl || content.generatedImageUrl.length < 10) {
      console.warn(`[Content Image API] No image data for id=${id}`)
      return new NextResponse(null, { status: 404 })
    }

    // Parse data URL: "data:image/png;base64,<data>" or "data:image/webp;base64,..."
    const match = content.generatedImageUrl.match(
      /^data:image\/([\w+.-]+);base64,(.+)$/s
    )

    if (!match) {
      // If it starts with http, redirect to it
      if (content.generatedImageUrl.startsWith('http')) {
        return NextResponse.redirect(content.generatedImageUrl)
      }
      console.warn(`[Content Image API] Unrecognized image format for id=${id}, starts with: ${content.generatedImageUrl.slice(0, 40)}`)
      return new NextResponse(null, { status: 404 })
    }

    const mimeType = `image/${match[1]}`
    const base64Data = match[2]
    const buffer = Buffer.from(base64Data, 'base64')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('[Content Image API] Error:', error)
    return new NextResponse(null, { status: 500 })
  }
}
