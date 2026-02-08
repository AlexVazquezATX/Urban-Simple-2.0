/**
 * Studio Clients Admin API
 *
 * GET - List all studio clients with filtering
 * POST - Create a new studio client
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getStudioClients,
  createStudioClient,
  type CreateStudioClientInput,
} from '@/lib/services/studio-admin-service'
import { StudioPlanTier } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const planTier = searchParams.get('planTier') as StudioPlanTier | undefined
    const search = searchParams.get('search') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await getStudioClients({
      status,
      planTier,
      search,
      limit,
      offset,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Admin Studio Clients] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyName, email, phone, planTier, monthlyGenerationsLimit } = body

    if (!companyName?.trim()) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    const input: CreateStudioClientInput = {
      companyName: companyName.trim(),
      email: email?.trim() || undefined,
      phone: phone?.trim() || undefined,
      planTier: planTier || 'TRIAL',
      monthlyGenerationsLimit,
      onboardedBy: user.id,
    }

    const client = await createStudioClient(input)

    return NextResponse.json({ client })
  } catch (error) {
    console.error('[Admin Studio Clients] Create error:', error)
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    )
  }
}
