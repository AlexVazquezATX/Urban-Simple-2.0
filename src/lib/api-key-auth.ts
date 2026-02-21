import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

const API_KEY_PREFIX = 'us_live_'

// Generate a new raw API key: us_live_ + 32 random hex bytes
export function generateRawApiKey(): string {
  return API_KEY_PREFIX + crypto.randomBytes(32).toString('hex')
}

// Hash a raw API key with SHA-256 for storage
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

// Get display prefix (first 12 chars) for identifying keys without exposing them
export function getKeyPrefix(rawKey: string): string {
  return rawKey.substring(0, 12)
}

// Same select shape as getCurrentUser() in src/lib/auth.ts
const USER_SELECT = {
  id: true,
  authId: true,
  companyId: true,
  branchId: true,
  email: true,
  firstName: true,
  lastName: true,
  displayName: true,
  phone: true,
  role: true,
  avatarUrl: true,
  isActive: true,
  emailSignature: true,
  signatureLogoUrl: true,
  company: {
    select: {
      id: true,
      name: true,
    },
  },
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
} as const

// Authenticate via API key in Authorization header
async function authenticateApiKey(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith(`Bearer ${API_KEY_PREFIX}`)) return null

  const rawKey = authHeader.substring(7) // strip "Bearer "
  const keyHash = hashApiKey(rawKey)

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      user: {
        select: USER_SELECT,
      },
    },
  })

  if (!apiKey) return null
  if (!apiKey.isActive) return null
  if (apiKey.revokedAt) return null
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null
  if (!apiKey.user.isActive) return null

  // Fire-and-forget usage tracking
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      lastUsedAt: new Date(),
      lastUsedIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      usageCount: { increment: 1 },
    },
  }).catch(() => {})

  return apiKey.user
}

// Unified auth: tries cookie auth first, falls back to API key
export async function getAuthenticatedUser(request: NextRequest) {
  // 1. Try cookie-based Supabase session (existing browser auth)
  const cookieUser = await getCurrentUser()
  if (cookieUser) return cookieUser

  // 2. Fall back to API key auth
  return authenticateApiKey(request)
}
