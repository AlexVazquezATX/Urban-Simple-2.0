import { Suspense } from 'react'
import { PublicNav } from '@/components/landing/public-nav'
import { BlogFeed } from './blog-feed'

export const metadata = {
  title: 'Blog - Urban Simple',
  description: 'Stay up to date with Austin\'s food scene, hospitality industry insights, and local happenings.',
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      <PublicNav />

      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-charcoal-900 leading-tight tracking-tight mb-4">
              The Austin Scene
            </h1>
            <p className="text-lg sm:text-xl text-charcoal-600 max-w-2xl mx-auto">
              Local happenings, food scene insights, and what makes Austin special
            </p>
          </div>

          {/* Blog Feed */}
          <Suspense fallback={<LoadingSkeleton />}>
            <BlogFeed />
          </Suspense>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-charcoal-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-charcoal-400">
              &copy; {new Date().getFullYear()} Urban Simple. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-12">
      <div className="rounded-3xl bg-cream-200 animate-pulse h-[500px]" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-2xl bg-cream-200 animate-pulse h-[400px]" />
        ))}
      </div>
    </div>
  )
}
