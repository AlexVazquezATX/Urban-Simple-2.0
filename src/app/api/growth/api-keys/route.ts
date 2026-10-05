import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { generateRawApiKey, hashApiKey, getKeyPrefix } from '@/lib/api-key-auth'

// GET /api/growth/api-keys - List API keys for company
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(apiKeys)
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
  }
}

// POST /api/growth/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, scopes } = body
    // Only expose the enforceable limited grant here. Omitted scopes preserve
    // the existing UI behavior; mixed grants must not masquerade as read-only.
    if (scopes !== undefined && (!Array.isArray(scopes) || scopes.length !== 1 || scopes[0] !== 'crm:read')) {
      return NextResponse.json({ error: 'Explicit scopes must be ["crm:read"]' }, { status: 400 })
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const rawKey = generateRawApiKey()
    const keyHash = hashApiKey(rawKey)
    const keyPrefix = getKeyPrefix(rawKey)

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        name: name.trim(),
        description: description?.trim() || null,
        keyHash,
        keyPrefix,
        scopes: scopes ?? [],
        expiresAt: scopes ? new Date(Date.now() + 30 * 24 * 60 * 60_000) : null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        scopes: true,
        expiresAt: true,
      },
    })

    // Return the raw key ONCE — it cannot be retrieved again
    return NextResponse.json({
      ...apiKey,
      rawKey,
    })
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }
}
