/**
 * Studio Client Detail API
 *
 * GET - Get detailed info for a single client
 * PATCH - Update a client's subscription
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getStudioClientDetail,
  updateStudioClient,
  type UpdateStudioClientInput,
} from '@/lib/services/studio-admin-service'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const client = await getStudioClientDetail(id)

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('[Admin Studio Client Detail] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const input: UpdateStudioClientInput = {
      planTier: body.planTier,
      monthlyGenerationsLimit: body.monthlyGenerationsLimit,
      status: body.status,
      monthlyRate: body.monthlyRate,
    }

    const client = await updateStudioClient(id, input)

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('[Admin Studio Client Update] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}
