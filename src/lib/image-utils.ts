/**
 * Client-side image utilities.
 * Handles HEIC/HEIF → JPEG conversion so iPhone photos work everywhere.
 *
 * Strategy:
 * 1. Try native browser rendering (Chrome 132+, Safari) via canvas
 * 2. Fall back to heic2any WASM decoder
 * 3. Give a clear error if both fail
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
 * Try to render an image file via the browser's native <img> + canvas.
 * Returns a JPEG File if the browser can decode it, or null if it can't.
 */
async function tryNativeConversion(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    const cleanup = () => URL.revokeObjectURL(url)

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) { cleanup(); resolve(null); return }

        ctx.drawImage(img, 0, 0)
        canvas.toBlob(
          (blob) => {
            cleanup()
            if (!blob) { resolve(null); return }
            const name = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg')
            resolve(new File([blob], name, { type: 'image/jpeg' }))
          },
          'image/jpeg',
          0.85
        )
      } catch {
        cleanup()
        resolve(null)
      }
    }

    img.onerror = () => { cleanup(); resolve(null) }

    // Give the browser 5s to try loading the HEIC natively
    setTimeout(() => { cleanup(); resolve(null) }, 5000)

    img.src = url
  })
}

/**
 * If the file is HEIC/HEIF, convert it to JPEG and return a new File.
 * Otherwise return the original file untouched.
 */
export async function ensureWebCompatible(file: File): Promise<File> {
  if (!isHeicFile(file)) return file

  // 1. Try native browser HEIC support (Safari, Chrome 132+ with HEVC codec)
  const native = await tryNativeConversion(file)
  if (native) return native

  // 2. Fall back to heic2any WASM decoder
  try {
    const heic2any = (await import('heic2any')).default
    const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
    const result = Array.isArray(blob) ? blob[0] : blob
    const name = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg')
    return new File([result], name, { type: 'image/jpeg' })
  } catch {
    // 3. Neither method worked
    throw new Error(
      'Unable to convert this HEIC file. Please convert it to JPG or PNG first (e.g. open in Photos and export as JPEG).'
    )
  }
}
