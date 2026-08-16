// RFC 7009 — token revocation. Accepts an access or refresh token; revoking
// either kills the whole pair. Always 200 (per spec) unless the client itself
// fails to authenticate.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sha256 } from '@/lib/oauth/core'
import { authenticateClient, parseTokenRequest } from '@/lib/oauth/client-auth'

const HEADERS = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEADERS })
}

export async function POST(request: NextRequest) {
  const params = await parseTokenRequest(request)
  const auth = await authenticateClient(request, params)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, error_description: auth.description }, { status: 401, headers: HEADERS })
  }
  const token = params.token
  if (token) {
    const hash = sha256(token)
    await prisma.oAuthToken.updateMany({
      where: {
        clientId: auth.client.id,
        revokedAt: null,
        OR: [{ accessTokenHash: hash }, { refreshTokenHash: hash }],
      },
      data: { revokedAt: new Date() },
    })
  }
  return new NextResponse(null, { status: 200, headers: HEADERS })
}
