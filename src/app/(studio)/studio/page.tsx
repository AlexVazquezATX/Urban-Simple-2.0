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
  TrendingUp,
  Calendar,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UsageBar } from '@/components/creative-studio'
import { toast } from 'sonner'
import { ThrottledImage } from '@/components/studio/throttled-image'

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
      const [statsResponse, recentResponse] = await Promise.all([
        fetch('/api/creative-studio/content?includeStats=true&limit=1'),
        fetch('/api/creative-studio/content?recent=true&limit=6'),
      ])

      const statsData = await statsResponse.json()
      const recentData = await recentResponse.json()

      setStats(statsData.stats || null)
      setRecentContent(recentData.content || [])
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

  return (
    <div className="p-4 md:p-6">
      {/* Usage Bar */}
      <UsageBar />

      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mt-6">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-medium tracking-tight text-warm-900">
            Dashboard
          </h1>
          <p className="text-sm text-warm-500 mt-0.5">
            Professional food photography & branded content
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <p className="text-xl font-semibold text-warm-900">
              {stats?.totalGenerations || 0}
            </p>
            <p className="text-xs text-warm-500">generated</p>
          </div>
          <div className="h-8 w-px bg-warm-200" />
          <div className="text-right">
            <p className="text-xl font-semibold text-lime-600">
              {stats?.savedContent || 0}
            </p>
            <p className="text-xs text-warm-500">saved</p>
          </div>
        </div>
      </div>

      {/* Action Cards - Main CTAs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Link href="/studio/generate?mode=food_photo" className="group">
          <div className="h-32 rounded-sm bg-gradient-to-br from-amber-500 to-orange-500 p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between h-full">
              <div className="text-white">
                <div className="w-10 h-10 rounded-sm bg-white/20 flex items-center justify-center mb-3">
                  <Camera className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-medium">Food Photography</h2>
                <p className="text-sm text-white/80 mt-0.5">
                  Transform dish photos into professional images
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
            </div>
          </div>
        </Link>

        <Link href="/studio/generate?mode=branded_post" className="group">
          <div className="h-32 rounded-sm bg-gradient-to-br from-purple-500 to-pink-500 p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between h-full">
              <div className="text-white">
                <div className="w-10 h-10 rounded-sm bg-white/20 flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-medium">Branded Posts</h2>
                <p className="text-sm text-white/80 mt-0.5">
                  Create promotional graphics with your brand
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
            </div>
          </div>
        </Link>
      </div>

      {/* Secondary Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Link href="/studio/gallery" className="group">
          <div className="h-20 rounded-sm bg-white border border-warm-200 p-3 hover:border-lime-400 transition-colors flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-warm-100 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-warm-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-warm-900">Gallery</h3>
              <p className="text-xs text-warm-500 truncate">Browse saved</p>
            </div>
          </div>
        </Link>

        <Link href="/studio/brand-kit" className="group">
          <div className="h-20 rounded-sm bg-white border border-warm-200 p-3 hover:border-plum-400 transition-colors flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-plum-100 flex items-center justify-center shrink-0">
              <Palette className="w-4 h-4 text-plum-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-warm-900">Brand Kit</h3>
              <p className="text-xs text-warm-500 truncate">Colors & logo</p>
            </div>
          </div>
        </Link>

        <div className="h-20 rounded-sm bg-white border border-warm-200 p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-ocean-100 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-ocean-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-warm-900">This Month</h3>
            <p className="text-xs text-ocean-600 font-medium">
              {stats?.thisMonthGenerations || 0} created
            </p>
          </div>
        </div>

        <div className="h-20 rounded-sm bg-white border border-warm-200 p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-amber-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-warm-900">Food Photos</h3>
            <p className="text-xs text-amber-600 font-medium">
              {stats?.generationsByMode?.food_photo || 0} generated
            </p>
          </div>
        </div>
      </div>

      {/* Recent Content */}
      <div className="rounded-sm bg-white border border-warm-200">
        <div className="px-4 py-3 border-b border-warm-200 flex items-center justify-between">
          <h2 className="text-base font-display font-medium text-warm-900">
            Recent Creations
          </h2>
          {hasContent && (
            <Link
              href="/studio/gallery"
              className="text-xs text-ocean-600 hover:text-ocean-700 font-medium"
            >
              View all
            </Link>
          )}
        </div>

        {hasContent ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
            {recentContent.map((item) => (
              <Link
                key={item.id}
                href={`/studio/gallery?view=${item.id}`}
                className="group"
              >
                <div className="rounded-sm border border-warm-200 overflow-hidden hover:border-lime-400 transition-colors">
                  <div className="aspect-square bg-warm-100 relative">
                    {item.hasImage ? (
                      <ThrottledImage
                        src={`/api/creative-studio/content/image?id=${item.id}`}
                        alt={item.headline || 'Generated image'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-warm-300" />
                      </div>
                    )}
                    <Badge
                      className={`absolute top-2 left-2 text-[10px] px-1.5 py-0 rounded-sm ${
                        item.mode === 'food_photo'
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-purple-100 text-purple-700 border-purple-200'
                      }`}
                    >
                      {item.mode === 'food_photo' ? 'Food' : 'Branded'}
                    </Badge>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs text-warm-900 font-medium truncate">
                      {item.headline || item.outputFormat || 'Untitled'}
                    </p>
                    <p className="text-[10px] text-warm-500 mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-4 py-12 text-center">
            <div className="w-14 h-14 rounded-sm bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-3">
              <Camera className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-sm font-medium text-warm-900 mb-1">
              Start creating professional content
            </h3>
            <p className="text-xs text-warm-500 mb-4 max-w-sm mx-auto">
              Transform your dish photos or generate branded graphics in seconds.
            </p>
            <Link href="/studio/generate">
              <Button variant="lime" size="sm" className="rounded-sm">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Create Your First Image
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
