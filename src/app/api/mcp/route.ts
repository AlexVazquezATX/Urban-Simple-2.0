import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { mcpDelete, mcpGet, serveMcp } from '@/lib/mcp/server'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  return serveMcp(request, user && 'via' in user ? user : null)
}
export const GET = mcpGet
export const DELETE = mcpDelete
