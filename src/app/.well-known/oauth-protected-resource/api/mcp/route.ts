// RFC 9728 path-suffixed variant: /.well-known/oauth-protected-resource/api/mcp
import { NextRequest } from 'next/server'
import { metadataOptions, metadataResponse, protectedResourceMetadata } from '@/lib/oauth/metadata'

export async function GET(request: NextRequest) {
  return metadataResponse(protectedResourceMetadata(request))
}
export async function OPTIONS() {
  return metadataOptions()
}
