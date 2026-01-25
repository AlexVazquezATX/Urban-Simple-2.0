'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Image as ImageIcon,
  FileText,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  Loader2,
  ArrowUpRight,
  Wand2,
  Layers,
  Zap,
  Sun,
  TrendingUp,
  Eye,
  Edit2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface DashboardStats {
  totalContent: number
  contentByPlatform: Record<string, number>
  contentByStatus: Record<string, number>
  totalImages: number
  recentContent: Array<{
    id: string
    platform: string
    headline?: string
    primaryText: string
    status: string
    createdAt: string
    image?: { imageUrl?: string; imageBase64?: string }
  }>
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  meta_ad: <Zap className="w-4 h-4" />,
  google_display: <Layers className="w-4 h-4" />,
  linkedin_ad: <Linkedin className="w-4 h-4" />,
}

export default function CreativeHubPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      // Fetch content stats and images count in parallel
      const [contentResponse, imagesResponse] = await Promise.all([
        fetch('/api/creative-hub/content?includeStats=true&limit=6'),
        fetch('/api/creative-hub/images?limit=1'), // Just need the count
      ])

      const contentData = await contentResponse.json()
      const imagesData = await imagesResponse.json()

      setStats({
        totalContent: contentData.stats?.total || 0,
        contentByPlatform: contentData.stats?.byPlatform || {},
        contentByStatus: contentData.stats?.byStatus || {},
        totalImages: imagesData.pagination?.total || imagesData.images?.length || 0,
        recentContent: contentData.content || [],
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-warm-50">
        <Loader2 className="w-5 h-5 animate-spin text-warm-400" />
      </div>
    )
  }

  const hasContent = stats?.recentContent && stats.recentContent.length > 0

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-warm-50 min-h-screen">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-medium tracking-tight text-warm-900">Creative Hub</h1>
          <p className="text-sm text-warm-500 mt-0.5">
            AI-powered content for Urban Simple
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <p className="text-xl font-semibold text-warm-900">{stats?.totalContent || 0}</p>
            <p className="text-xs text-warm-500">created</p>
          </div>
          <div className="h-8 w-px bg-warm-200" />
          <div className="text-right">
            <p className="text-xl font-semibold text-lime-600">{stats?.contentByStatus?.approved || 0}</p>
            <p className="text-xs text-warm-500">ready</p>
          </div>
        </div>
      </div>

      {/* Action Cards - Single row of 4 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* Create Content */}
        <Link href="/creative-hub/create" className="group">
          <div className="h-20 rounded-sm bg-white border border-warm-200 p-3 hover:border-lime-400 transition-colors flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-lime-100 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-lime-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-warm-900">Create</h2>
              <p className="text-xs text-warm-500 truncate">Generate posts</p>
            </div>
          </div>
        </Link>

        {/* Daily Inspiration */}
        <Link href="/creative-hub/inspiration" className="group">
          <div className="h-20 rounded-sm bg-white border border-warm-200 p-3 hover:border-ocean-400 transition-colors flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-plum-100 flex items-center justify-center shrink-0">
              <Sun className="w-4 h-4 text-plum-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-warm-900">Inspiration</h2>
              <p className="text-xs text-warm-500 truncate">Trending ideas</p>
            </div>
          </div>
        </Link>

        {/* Image Library */}
        <Link href="/creative-hub/images" className="group">
          <div className="h-20 rounded-sm bg-white border border-warm-200 p-3 hover:border-ocean-400 transition-colors flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-ocean-100 flex items-center justify-center shrink-0">
              <ImageIcon className="w-4 h-4 text-ocean-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-warm-900">Images</h2>
              <p className="text-xs text-ocean-600 font-medium">{stats?.totalImages || 0} saved</p>
            </div>
          </div>
        </Link>

        {/* Content Gallery */}
        <Link href="/creative-hub/gallery" className="group">
          <div className="h-20 rounded-sm bg-white border border-warm-200 p-3 hover:border-ocean-400 transition-colors flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-warm-200 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-warm-700" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-warm-900">Gallery</h2>
              <p className="text-xs text-warm-500 truncate">Browse & export</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Content Section */}
      <div className="rounded-sm bg-white border border-warm-200">
        <div className="px-4 py-3 border-b border-warm-200 flex items-center justify-between">
          <h2 className="text-base font-display font-medium text-warm-900">Recent Creations</h2>
          {hasContent && (
            <Link href="/creative-hub/gallery" className="text-xs text-ocean-600 hover:text-ocean-700 font-medium">
              View all
            </Link>
          )}
        </div>

        {hasContent ? (
          <div className="p-4 space-y-1.5">
            {stats?.recentContent.slice(0, 5).map((content) => (
              <div key={content.id} className="px-3 py-2.5 rounded-sm border border-warm-200 hover:border-ocean-400 transition-colors flex items-center gap-3 group">
                {/* Thumbnail or Platform Icon */}
                {content.image ? (
                  <div className="w-10 h-10 rounded-sm overflow-hidden bg-warm-100 shrink-0">
                    <img
                      src={content.image.imageUrl || `data:image/png;base64,${content.image.imageBase64}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-sm bg-warm-100 flex items-center justify-center shrink-0 text-warm-500">
                    {PLATFORM_ICONS[content.platform]}
                  </div>
                )}

                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warm-900 truncate">
                    {content.headline || content.primaryText.substring(0, 50)}
                  </p>
                  <p className="text-xs text-warm-500 mt-0.5">
                    {content.platform.replace('_', ' ')} · {new Date(content.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>

                {/* Actions - show on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/creative-hub/gallery?view=${content.id}`}
                    className="p-1.5 rounded-sm hover:bg-warm-200 text-warm-500 hover:text-ocean-600 transition-colors"
                    title="View"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/creative-hub/gallery?edit=${content.id}`}
                    className="p-1.5 rounded-sm hover:bg-warm-200 text-warm-500 hover:text-ocean-600 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Status */}
                <Badge className={`rounded-sm text-[10px] px-1.5 py-0 ${
                  content.status === 'approved'
                    ? 'bg-lime-100 text-lime-700 border-lime-200'
                    : content.status === 'draft'
                      ? 'bg-plum-100 text-plum-700 border-plum-200'
                      : 'bg-warm-100 text-warm-600 border-warm-200'
                }`}>
                  {content.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-10 text-center">
            <div className="w-12 h-12 rounded-sm bg-lime-100 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-5 h-5 text-lime-600" />
            </div>
            <h3 className="text-sm font-medium text-warm-900 mb-1">Your creative canvas awaits</h3>
            <p className="text-xs text-warm-500 mb-4 max-w-sm mx-auto">
              Generate social posts and ads in seconds with AI.
            </p>
            <Link href="/creative-hub/create">
              <Button variant="lime" size="sm" className="rounded-sm">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Start Creating
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
