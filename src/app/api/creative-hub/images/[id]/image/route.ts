import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * Serve a creative image as binary.
 *
 * Returns the image directly (not wrapped in JSON) so <img src="...">
 * can load it natively. This avoids sending massive base64 strings
 * in gallery listing responses.
 *
 * Supports ?w=300 for thumbnail sizing (future enhancement).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { id } = await params

    const image = await prisma.creativeImage.findUnique({
      where: { id },
      select: { imageBase64: true, imageUrl: true, companyId: true },
    })

    if (!image || image.companyId !== user.companyId) {
      return new NextResponse('Not found', { status: 404 })
    }

    // If image has a URL, redirect to it
    if (image.imageUrl) {
      return NextResponse.redirect(image.imageUrl)
    }

    // Serve base64 as binary image
    if (image.imageBase64) {
      const buffer = Buffer.from(image.imageBase64, 'base64')

      // Detect format from magic bytes
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50
      const mimeType = isPng ? 'image/png' : 'image/jpeg'

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }

    return new NextResponse('No image data', { status: 404 })
  } catch (error) {
    console.error('[Image Serve] Error:', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}
