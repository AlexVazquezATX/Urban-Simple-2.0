import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

export default function StudioNotFound() {
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
          <p className="text-5xl font-display font-bold text-warm-200 mb-4">404</p>
          <h1 className="text-lg font-display font-medium text-charcoal-900 mb-2">
            Page not found
          </h1>
          <p className="text-sm text-warm-500 mb-6">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link href="/studio">
            <Button className="bg-gradient-to-br from-ocean-500 to-ocean-600 hover:from-ocean-600 hover:to-ocean-700 text-white">
              Back to Studio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
