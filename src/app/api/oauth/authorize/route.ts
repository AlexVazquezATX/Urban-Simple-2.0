import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { consentDecision } from '@/lib/oauth/consent'

export async function POST(request: NextRequest) {
  return consentDecision(request, await getCurrentUser())
}
