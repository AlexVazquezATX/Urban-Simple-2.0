'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export default function StudioError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 p-4">
      <div className="text-center max-w-md">
        <Link href="/studio" className="inline-flex items-center gap-1.5 justify-center mb-8">
          <Image
            src="/images/backhaus-logos/backhaus-logo-compact.png"
            alt="BackHaus"
            width={200}
            height={40}
            className="h-7 w-auto opacity-70"
          />
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mb-0.5" />
        </Link>

        <div className="bg-white rounded-lg shadow-sm border border-warm-200 p-8">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="text-lg font-display font-medium text-charcoal-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-warm-500 mb-6">
            We hit an unexpected error. This has been logged and we&apos;ll look into it.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={reset}
              variant="outline"
              className="border-warm-200"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Try Again
            </Button>
            <Link href="/studio">
              <Button className="bg-gradient-to-br from-ocean-500 to-ocean-600 hover:from-ocean-600 hover:to-ocean-700 text-white">
                Back to Studio
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
