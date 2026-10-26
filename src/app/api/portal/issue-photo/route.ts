import { NextRequest, NextResponse } from 'next/server'
import { getPortalContext } from '@/lib/portal-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { uploadPortalPhoto } from '@/lib/portal-photos'

// POST /api/portal/issue-photo — upload one photo for an issue report or a
// service request. Same validation as walkthrough photos; the returned URL
// is submitted with the issue/request itself.
export async function POST(request: NextRequest) {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = checkRateLimit(`portal-issue-photo:${ctx.userId}`, { limit: 40, windowSeconds: 60 * 60 })
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many uploads. Please try again in a bit.' }, { status: 429 })
  }

  const formData = await request.formData().catch(() => null)
  const result = await uploadPortalPhoto({
    clientId: ctx.client.id,
    file: (formData?.get('file') as File | null) ?? null,
    folder: 'issues',
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ url: result.url, path: result.path })
}
