import { NextRequest, NextResponse } from 'next/server'
import { getPortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'

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

  const client = await prisma.client.findUnique({
    where: { id: ctx.client.id },
    select: { companyId: true },
  })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Image only here. Limit to 10MB per photo so the capture flow stays snappy.
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Photo too large (max 10MB)' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`
  const filePath = `walkthroughs/${client.companyId}/${ctx.client.id}/${fileName}`

  const { error } = await supabase.storage
    .from('images')
    .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type })
  if (error) {
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath)
  return NextResponse.json({ url: publicUrl, path: filePath })
}
