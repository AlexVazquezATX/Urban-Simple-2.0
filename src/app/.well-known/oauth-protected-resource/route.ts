// RFC 9728 — OAuth 2.0 Protected Resource Metadata (for /api/mcp).
import { NextRequest } from 'next/server'
import { metadataOptions, metadataResponse, protectedResourceMetadata } from '@/lib/oauth/metadata'

export async function GET(request: NextRequest) {
  return metadataResponse(protectedResourceMetadata(request))
}
export async function OPTIONS() {
  return metadataOptions()
}
