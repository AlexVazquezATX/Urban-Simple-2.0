'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ImageIcon } from 'lucide-react'

// Shared concurrency limiter — max 3 image fetches at a time
const MAX_CONCURRENT = 3
let activeLoads = 0
const loadQueue: (() => void)[] = []

function acquireSlot(): Promise<void> {
  if (activeLoads < MAX_CONCURRENT) {
    activeLoads++
    return Promise.resolve()
  }
  return new Promise((resolve) => loadQueue.push(resolve))
}

function releaseSlot() {
  activeLoads--
  if (loadQueue.length > 0) {
    activeLoads++
    loadQueue.shift()!()
  }
}

export function ThrottledImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    await acquireSlot()
    setState('loading')
    try {
      const res = await fetch(src)
      if (!res.ok) throw new Error(`${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)
      setState('loaded')
    } catch {
      setState('error')
    } finally {
      releaseSlot()
    }
  }, [src])

  // Start loading when the element enters the viewport (with 200px margin)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          load()
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [load])

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  return (
    <div ref={containerRef} className="w-full h-full">
      {state === 'loaded' && blobUrl ? (
        <img src={blobUrl} alt={alt} className={className} />
      ) : state === 'error' ? (
        <div className="w-full h-full flex items-center justify-center bg-warm-100">
          <ImageIcon className="w-8 h-8 text-warm-300" />
        </div>
      ) : (
        <div className="w-full h-full bg-warm-100 animate-pulse" />
      )}
    </div>
  )
}
