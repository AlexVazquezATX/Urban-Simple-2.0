import { NextRequest, NextResponse } from 'next/server'
import { getPortalContext } from '@/lib/portal-auth'
import { uploadPortalPhoto } from '@/lib/portal-photos'

// POST /api/portal/walkthrough-photo — upload a single walkthrough photo
// and return its public URL. The capture UI calls this once per photo so
// the user sees thumbnails immediately while the rest of the walkthrough
// is still being filled out. The URLs are then submitted with the
// walkthrough record itself.
//
// Files go under `walkthroughs/<companyId>/<clientId>/<filename>` in the
// existing `images` Supabase bucket.
export async function POST(request: NextRequest) {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData().catch(() => null)
  const result = await uploadPortalPhoto({
    clientId: ctx.client.id,
    file: (formData?.get('file') as File | null) ?? null,
    folder: 'walkthroughs',
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ url: result.url, path: result.path })
}
