// RFC 8414 — OAuth 2.0 Authorization Server Metadata.
import { NextRequest } from 'next/server'
import { authorizationServerMetadata, metadataOptions, metadataResponse } from '@/lib/oauth/metadata'

export async function GET(request: NextRequest) {
  return metadataResponse(authorizationServerMetadata(request))
}
export async function OPTIONS() {
  return metadataOptions()
}
