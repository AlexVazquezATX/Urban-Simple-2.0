/**
 * Client-side image utilities.
 * Handles HEIC/HEIF → JPEG conversion so iPhone photos work everywhere.
 */

const HEIC_TYPES = ['image/heic', 'image/heif']

/** Check whether a file is HEIC/HEIF (by MIME or extension fallback). */
export function isHeicFile(file: File): boolean {
  if (HEIC_TYPES.includes(file.type.toLowerCase())) return true
  // Some browsers don't set the MIME for HEIC — fall back to extension
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ext === 'heic' || ext === 'heif'
}

/**
 * If the file is HEIC/HEIF, convert it to JPEG and return a new File.
 * Otherwise return the original file untouched.
 */
export async function ensureWebCompatible(file: File): Promise<File> {
  if (!isHeicFile(file)) return file

  const heic2any = (await import('heic2any')).default
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })

  // heic2any can return a single Blob or an array (for multi-frame HEIC)
  const result = Array.isArray(blob) ? blob[0] : blob
  const name = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg')

  return new File([result], name, { type: 'image/jpeg' })
}
