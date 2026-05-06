// Shared helpers for portal document uploads. Used by both the portal-side
// upload (CLIENT_USER) and the admin-side upload (ADMIN/SUPER_ADMIN/MANAGER).

import { createClient } from '@supabase/supabase-js'

export const PORTAL_DOC_CATEGORIES = [
  { value: 'coi', label: 'Insurance / COI' },
  { value: 'sds', label: 'Safety Data Sheet (SDS)' },
  { value: 'training', label: 'Training Record' },
  { value: 'contract', label: 'Contract / Agreement' },
  { value: 'permit', label: 'Permit / License' },
  { value: 'pest_log', label: 'Pest Log' },
  { value: 'other', label: 'Other' },
] as const

export type PortalDocumentCategory = (typeof PORTAL_DOC_CATEGORIES)[number]['value']

export function portalDocCategoryLabel(value: string): string {
  return PORTAL_DOC_CATEGORIES.find(c => c.value === value)?.label ?? value
}

// Allowed mime types for document upload. Generous because GMs scan with
// whatever they have — phone camera, iPad, scanner. Excel/Word for things
// like training rosters.
export const ALLOWED_DOC_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
])

export const MAX_DOC_SIZE_BYTES = 25 * 1024 * 1024 // 25MB — covers scanned PDFs

export function getAdminStorageClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Storage not configured (missing SUPABASE env vars)')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Upload a portal document file to Supabase storage. Returns the public URL
// and the storage path (kept for later delete operations). Caller is
// responsible for creating the PortalDocument DB row.
//
// We reuse the existing `images` bucket for now to avoid extra setup; doc
// path lives under `portal-documents/<companyId>/<clientId>/<filename>`.
// The bucket is public, but the random filename prefix makes URLs not
// guessable. Real signed-URL access is a future hardening step.
export async function uploadPortalDocument(args: {
  file: File
  companyId: string
  clientId: string
}): Promise<{ url: string; path: string; size: number; mimeType: string }> {
  const { file, companyId, clientId } = args

  if (!ALLOWED_DOC_MIME_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`)
  }
  if (file.size > MAX_DOC_SIZE_BYTES) {
    throw new Error(`File too large (max ${MAX_DOC_SIZE_BYTES / 1024 / 1024}MB)`)
  }

  const supabase = getAdminStorageClient()

  const ext = file.name.split('.').pop() ?? 'bin'
  const safeStem = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60)
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${safeStem}.${ext}`
  const filePath = `portal-documents/${companyId}/${clientId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })
  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath)
  return { url: publicUrl, path: filePath, size: file.size, mimeType: file.type }
}

// Delete a stored portal-document file. Returns true on success, false if the
// remote file was already gone or couldn't be deleted (we still proceed with
// the DB delete on the caller's side).
export async function deletePortalDocumentFile(filePath: string): Promise<boolean> {
  try {
    const supabase = getAdminStorageClient()
    const { error } = await supabase.storage.from('images').remove([filePath])
    if (error) {
      console.warn('[portal-documents] delete file warning:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[portal-documents] delete file threw:', err)
    return false
  }
}

// Returns true if the doc expires within the next N days (default 30).
export function isExpiringSoon(expiresAt: Date | string | null | undefined, withinDays = 30): boolean {
  if (!expiresAt) return false
  const d = expiresAt instanceof Date ? expiresAt : new Date(expiresAt)
  if (Number.isNaN(d.getTime())) return false
  const ms = d.getTime() - Date.now()
  return ms > 0 && ms <= withinDays * 24 * 60 * 60 * 1000
}

export function isExpired(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return false
  const d = expiresAt instanceof Date ? expiresAt : new Date(expiresAt)
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}
