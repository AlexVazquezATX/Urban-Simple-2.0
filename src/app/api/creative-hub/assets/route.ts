import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  createBrandAsset,
  getBrandAssets,
  deleteBrandAsset,
} from '@/lib/services/brand-asset-service'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const search = searchParams.get('search') || undefined

    const assets = await getBrandAssets(user.companyId, { category, search })
    return NextResponse.json({ assets })
  } catch (error) {
    console.error('[Creative Hub Assets] GET error:', error)
    return NextResponse.json({ error: 'Failed to load assets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const name = (formData.get('name') as string) || ''
    const category = (formData.get('category') as string) || 'general'
    const tagsRaw = (formData.get('tags') as string) || ''

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)

    const asset = await createBrandAsset({
      companyId: user.companyId,
      name: name || file.name,
      category,
      tags,
      fileBuffer: buffer,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    })

    return NextResponse.json(asset)
  } catch (error) {
    console.error('[Creative Hub Assets] POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to upload asset'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Asset ID required' }, { status: 400 })
    }

    await deleteBrandAsset(id, user.companyId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Creative Hub Assets] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 })
  }
}
