'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Camera,
  Sparkles,
  ImageIcon,
  Layers,
  Palette,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { UsageBar } from '@/components/creative-studio'
import { toast } from 'sonner'
import { ThrottledImage } from '@/components/studio/throttled-image'
import { StatTile, ToolCard } from '@/components/studio/ui'

interface StudioStats {
  totalGenerations: number
  generationsByMode: Record<string, number>
  generationsByFormat: Record<string, number>
  thisMonthGenerations: number
  savedContent: number
}

interface ContentItem {
  id: string
  mode: string
  outputFormat?: string | null
  hasImage?: boolean
  headline?: string | null
  status: string
  createdAt: string
  brandKit?: {
    id: string
    restaurantName: string
  } | null
}

export default function StudioDashboardPage() {
  return (
    <Suspense>
      <StudioDashboardContent />
    </Suspense>
  )
}

function StudioDashboardContent() {
  const searchParams = useSearchParams()
  const [stats, setStats] = useState<StudioStats | null>(null)
  const [recentContent, setRecentContent] = useState<ContentItem[]>([])
  const [firstName, setFirstName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Show checkout success toast
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      toast.success('Subscription activated! You can now generate more content.')
    }
  }, [searchParams])

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const [statsResponse, recentResponse, userResponse] = await Promise.all([
        fetch('/api/creative-studio/content?includeStats=true&limit=1'),
        fetch('/api/creative-studio/content?recent=true&limit=6'),
        fetch('/api/users/me'),
      ])

      const statsData = await statsResponse.json()
      const recentData = await recentResponse.json()
      const userData = userResponse.ok ? await userResponse.json() : null

      setStats(statsData.stats || null)
      setRecentContent(recentData.content || [])
      if (userData?.firstName) setFirstName(userData.firstName)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-warm-400" />
      </div>
    )
  }

  const hasContent = recentContent.length > 0
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <UsageBar />

      <div className="px-5 md:px-8 py-7">
        {/* Greeting */}
        <div className="mb-7">
          <p className="text-sm text-warm-500">{greeting},</p>
          <h1 className="font-display text-4xl tracking-tight text-charcoal-900 mt-0.5">
            {firstName || 'Welcome back'}
          </h1>
        </div>

        {/* Hero create band */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-7">
          <Link
            href="/studio/generate?mode=food_photo"
            className="lg:col-span-3 group relative overflow-hidden rounded-3xl bg-charcoal-900 shadow-elevated p-7 min-h-[180px] flex flex-col justify-between"
          >
            <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-bronze-500/20 blur-3xl" />
            <div className="absolute right-6 bottom-0 w-40 h-40 rounded-full bg-honey-500/10 blur-2xl" />
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center mb-4 border border-white/10">
                <Camera className="w-5 h-5 text-honey-300" />
              </div>
              <h2 className="font-display text-2xl text-cream-50 tracking-tight">Food Photography</h2>
              <p className="text-sm text-cream-300 mt-1 max-w-sm">
                Turn a quick phone snap of any dish into a menu-ready, professional photograph in seconds.
              </p>
            </div>
            <div className="relative mt-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-honey-400 text-charcoal-900 text-sm font-semibold px-4 py-2 shadow-glow group-hover:bg-honey-300 transition-colors">
                <Sparkles className="w-4 h-4" /> Create a photo
              </span>
            </div>
          </Link>

          <Link
            href="/studio/generate?mode=branded_post"
            className="lg:col-span-2 group relative overflow-hidden rounded-3xl bg-white border border-cream-300 shadow-card p-7 min-h-[180px] flex flex-col justify-between hover:shadow-elevated transition-shadow"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-bronze-50 border border-bronze-100 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5 text-bronze-600" />
              </div>
              <h2 className="font-display text-2xl text-charcoal-900 tracking-tight">Branded Posts</h2>
              <p className="text-sm text-warm-500 mt-1">On-brand promo graphics with your logo, colors and copy.</p>
            </div>
            <div className="mt-5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-bronze-200 text-bronze-700 text-sm font-semibold px-4 py-2 group-hover:bg-bronze-50 transition-colors">
                Design a post <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <StatTile label="This month" value={stats?.thisMonthGenerations || 0} sub="creations" accent="text-bronze-600" />
          <StatTile label="All time" value={stats?.totalGenerations || 0} sub="generated" accent="text-charcoal-900" />
          <StatTile label="Saved" value={stats?.savedContent || 0} sub="in your gallery" accent="text-sage-500" />
          <StatTile label="Food photos" value={stats?.generationsByMode?.food_photo || 0} sub="created" accent="text-terracotta-500" />
        </div>

        {/* Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-8">
          <ToolCard icon={Layers} title="Gallery" sub="Browse everything you've made" href="/studio/gallery" />
          <ToolCard icon={Palette} title="Brand Kit" sub="Your colors, logo & style" href="/studio/brand-kit" />
        </div>

        {/* Recent creations */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="font-display text-xl text-charcoal-900 tracking-tight">Recent creations</h2>
            {hasContent && (
              <Link
                href="/studio/gallery"
                className="text-sm text-bronze-600 hover:text-bronze-700 font-medium inline-flex items-center gap-1"
              >
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {hasContent ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {recentContent.map((item) => (
                <Link
                  key={item.id}
                  href={`/studio/gallery?view=${item.id}`}
                  className="group rounded-2xl overflow-hidden bg-white border border-cream-300/70 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="aspect-[4/3] bg-cream-200 relative">
                    {item.hasImage ? (
                      <ThrottledImage
                        src={`/api/creative-studio/content/image?id=${item.id}`}
                        alt={item.headline || 'Generated image'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-cream-400" />
                      </div>
                    )}
                    <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-charcoal-900/35 backdrop-blur text-white px-2 py-0.5 border border-white/10">
                      {item.mode === 'food_photo' ? 'Food' : 'Branded'}
                    </span>
                  </div>
                  <div className="px-3.5 py-3">
                    <p className="text-sm font-medium text-charcoal-900 truncate">
                      {item.headline || item.outputFormat || 'Untitled'}
                    </p>
                    <p className="text-xs text-warm-500 mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-cream-300/70 shadow-soft px-4 py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-bronze-50 border border-bronze-100 flex items-center justify-center mx-auto mb-3">
                <Camera className="w-6 h-6 text-bronze-600" />
              </div>
              <h3 className="font-display text-lg text-charcoal-900 mb-1">Start creating professional content</h3>
              <p className="text-sm text-warm-500 mb-5 max-w-sm mx-auto">
                Transform your dish photos or generate branded graphics in seconds.
              </p>
              <Link
                href="/studio/generate"
                className="inline-flex items-center gap-1.5 rounded-full bg-honey-400 hover:bg-honey-500 text-charcoal-900 text-sm font-semibold px-5 py-2.5 shadow-glow transition-colors"
              >
                <Sparkles className="w-4 h-4" /> Create your first image
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
