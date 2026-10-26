// Portal photo uploads (walkthrough zones, issue reports, service requests).
// Server-only. Files go under `<folder>/<companyId>/<clientId>/<file>` in the
// public `images` Supabase bucket.

import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'

export type PortalPhotoFolder = 'walkthroughs' | 'issues'

const MAX_BYTES = 10 * 1024 * 1024

export type PortalPhotoUploadResult =
  | { ok: true; url: string; path: string }
  | { ok: false; error: string; status: number }

export async function uploadPortalPhoto(params: {
  clientId: string
  file: File | null
  folder: PortalPhotoFolder
}): Promise<PortalPhotoUploadResult> {
  const { file, clientId, folder } = params
  if (!file || file.size === 0) return { ok: false, error: 'No file provided', status: 400 }
  // Image only. Limit to 10MB per photo so the capture flow stays snappy.
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: 'File must be an image', status: 400 }
  }
  if (file.size > MAX_BYTES) return { ok: false, error: 'Photo too large (max 10MB)', status: 400 }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { companyId: true },
  })
  if (!client) return { ok: false, error: 'Client not found', status: 404 }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, error: 'Storage not configured', status: 500 }
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const rawExt = (file.name.split('.').pop() ?? '').toLowerCase()
  const ext = /^[a-z0-9]{2,5}$/.test(rawExt) ? rawExt : 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`
  const filePath = `${folder}/${client.companyId}/${clientId}/${fileName}`

  const { error } = await supabase.storage
    .from('images')
    .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type })
  if (error) return { ok: false, error: `Upload failed: ${error.message}`, status: 500 }

  const {
    data: { publicUrl },
  } = supabase.storage.from('images').getPublicUrl(filePath)
  return { ok: true, url: publicUrl, path: filePath }
}

/** True when the URL is a portal upload that belongs to this client. */
export function isOwnPortalPhotoUrl(url: unknown, clientId: string): url is string {
  if (typeof url !== 'string' || url.length > 1000) return false
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!base) return false
  const prefix = `${base}/storage/v1/object/public/images/`
  if (!url.startsWith(prefix)) return false
  const parts = url.slice(prefix.length).split('/')
  return (
    parts.length === 4 &&
    (parts[0] === 'walkthroughs' || parts[0] === 'issues') &&
    parts[2] === clientId &&
    /^[\w.-]+$/.test(parts[3])
  )
}

/** Keep only this client's own uploaded photo URLs, de-duplicated, capped. */
export function cleanPortalPhotos(input: unknown, clientId: string, max: number): string[] {
  if (!Array.isArray(input)) return []
  return [...new Set(input.filter(u => isOwnPortalPhotoUrl(u, clientId)))].slice(0, max)
}
