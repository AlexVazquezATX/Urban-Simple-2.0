/**
 * Restaurant Creative Studio - Brand Kit API
 *
 * CRUD operations for restaurant brand kits
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  createBrandKit,
  getBrandKitsByCompany,
  getDefaultBrandKit,
  updateBrandKit,
  deleteBrandKit,
} from '@/lib/services/restaurant-studio-service'

// GET - List brand kits for company
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const defaultOnly = searchParams.get('default') === 'true'

    if (defaultOnly) {
      const brandKit = await getDefaultBrandKit(user.companyId)
      return NextResponse.json({ brandKit })
    }

    const brandKits = await getBrandKitsByCompany(user.companyId)
    return NextResponse.json({ brandKits })
  } catch (error) {
    console.error('Error fetching brand kits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brand kits' },
      { status: 500 }
    )
  }
}

// POST - Create new brand kit
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.restaurantName) {
      return NextResponse.json(
        { error: 'Restaurant name is required' },
        { status: 400 }
      )
    }

    if (!body.primaryColor) {
      return NextResponse.json(
        { error: 'Primary color is required' },
        { status: 400 }
      )
    }

    const brandKit = await createBrandKit({
      companyId: user.companyId,
      restaurantName: body.restaurantName,
      logoUrl: body.logoUrl,
      primaryColor: body.primaryColor,
      secondaryColor: body.secondaryColor,
      accentColor: body.accentColor,
      brandPhotos: body.brandPhotos || [],
      cuisineType: body.cuisineType,
      preferredStyle: body.preferredStyle,
      isDefault: body.isDefault ?? true, // First kit is default
    })

    return NextResponse.json({ brandKit })
  } catch (error) {
    console.error('Error creating brand kit:', error)
    return NextResponse.json(
      { error: 'Failed to create brand kit' },
      { status: 500 }
    )
  }
}

// PUT - Update brand kit
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { error: 'Brand kit ID is required' },
        { status: 400 }
      )
    }

    const brandKit = await updateBrandKit(body.id, {
      restaurantName: body.restaurantName,
      logoUrl: body.logoUrl,
      primaryColor: body.primaryColor,
      secondaryColor: body.secondaryColor,
      accentColor: body.accentColor,
      brandPhotos: body.brandPhotos,
      cuisineType: body.cuisineType,
      preferredStyle: body.preferredStyle,
      isDefault: body.isDefault,
    })

    return NextResponse.json({ brandKit })
  } catch (error) {
    console.error('Error updating brand kit:', error)
    return NextResponse.json(
      { error: 'Failed to update brand kit' },
      { status: 500 }
    )
  }
}

// DELETE - Remove brand kit
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Brand kit ID is required' },
        { status: 400 }
      )
    }

    await deleteBrandKit(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting brand kit:', error)
    return NextResponse.json(
      { error: 'Failed to delete brand kit' },
      { status: 500 }
    )
  }
}
