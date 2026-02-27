/**
 * Brand Asset API
 *
 * GET  - List assets for the current user's company
 * POST - Upload a new brand asset
 * DELETE - Remove a brand asset
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  createBrandAsset,
  getBrandAssets,
  deleteBrandAsset,
  countBrandAssets,
} from '@/lib/services/brand-asset-service'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const search = searchParams.get('search') || undefined

    const assets = await getBrandAssets(user.companyId, { category, search })

    return NextResponse.json({ assets })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Assets API] GET error:', message)
    return NextResponse.json({ error: 'Failed to load assets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const name = formData.get('name') as string
    const category = (formData.get('category') as string) || 'general'
    const description = formData.get('description') as string | null
    const tagsRaw = formData.get('tags') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })
    }

    const tags = tagsRaw
      ? tagsRaw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
      : []

    const buffer = Buffer.from(await file.arrayBuffer())

    const asset = await createBrandAsset({
      companyId: user.companyId,
      name,
      description: description || undefined,
      category,
      tags,
      fileBuffer: buffer,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Assets API] POST error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 })
    }

    await deleteBrandAsset(id, user.companyId)

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Assets API] DELETE error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
