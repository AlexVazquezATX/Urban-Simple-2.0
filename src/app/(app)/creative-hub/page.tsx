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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-ocean-500" />
      </div>
    )
  }

  const hasContent = stats?.recentContent && stats.recentContent.length > 0

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center">
                  <Wand2 className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs font-medium text-ocean-600 uppercase tracking-wider">Creative Hub</span>
              </div>
              <h1 className="text-2xl font-semibold text-charcoal-900">
                Marketing Studio
              </h1>
              <p className="text-charcoal-500 mt-1">
                AI-powered content for Urban Simple
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="text-right">
                <p className="text-2xl font-semibold text-charcoal-900">{stats?.totalContent || 0}</p>
                <p className="text-xs text-charcoal-400">pieces created</p>
              </div>
              <div className="h-8 w-px bg-charcoal-200" />
              <div className="text-right">
                <p className="text-2xl font-semibold text-charcoal-900">{stats?.contentByStatus?.approved || 0}</p>
                <p className="text-xs text-charcoal-400">ready to post</p>
              </div>
            </div>
          </div>

          {/* Main Action Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* Daily Inspiration - New Feature */}
            <Link href="/creative-hub/inspiration" className="group">
              <div className="relative h-44 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/20 hover:scale-[1.01]">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 right-4 w-24 h-24 rounded-full bg-white blur-2xl" />
                </div>

                <div className="relative h-full flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white/90 text-xs font-medium mb-3">
                      <TrendingUp className="w-3 h-3" />
                      New
                    </div>
                    <h2 className="text-lg font-semibold text-white mb-1">Daily Inspiration</h2>
                    <p className="text-white/80 text-xs">Trending topics & content ideas</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-orange-600 transition-all">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Generate Content - Primary CTA */}
            <Link href="/creative-hub/create" className="group">
              <div className="relative h-44 rounded-2xl bg-gradient-to-br from-ocean-500 via-ocean-600 to-ocean-700 p-5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-ocean-500/20 hover:scale-[1.01]">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 right-4 w-24 h-24 rounded-full bg-white blur-2xl" />
                </div>

                <div className="relative h-full flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white/90 text-xs font-medium mb-3">
                      <Sparkles className="w-3 h-3" />
                      AI-Powered
                    </div>
                    <h2 className="text-lg font-semibold text-white mb-1">Create Content</h2>
                    <p className="text-ocean-100 text-xs">Generate posts & ads with AI</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-1">
                      {['linkedin', 'instagram', 'facebook'].map((p) => (
                        <div key={p} className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white border border-ocean-600">
                          {PLATFORM_ICONS[p]}
                        </div>
                      ))}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-ocean-600 transition-all">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Image Library */}
            <Link href="/creative-hub/images" className="group">
              <div className="relative h-44 rounded-2xl bg-gradient-to-br from-bronze-50 to-bronze-100 border border-bronze-200/50 p-5 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-bronze-300 hover:scale-[1.01]">
                <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-bronze-200/50 blur-2xl" />

                <div className="relative h-full flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-bronze-500/10 flex items-center justify-center mb-3">
                      <ImageIcon className="w-5 h-5 text-bronze-600" />
                    </div>
                    <h3 className="font-semibold text-charcoal-900 mb-0.5">Image Library</h3>
                    <p className="text-xs text-charcoal-500">AI-generated visuals</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-bronze-600 font-medium">{stats?.totalImages || 0} images</span>
                    <ArrowUpRight className="w-4 h-4 text-bronze-400 group-hover:text-bronze-600 transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Secondary Row */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {/* Content Gallery */}
            <Link href="/creative-hub/gallery" className="col-span-2 group">
              <div className="h-28 rounded-xl bg-white border border-charcoal-100 p-4 flex items-center gap-4 transition-all duration-200 hover:border-charcoal-200 hover:shadow-md">
                <div className="w-12 h-12 rounded-xl bg-charcoal-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-charcoal-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-charcoal-900">Content Gallery</h3>
                  <p className="text-sm text-charcoal-500">Browse, edit & export your content</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-charcoal-300 group-hover:text-charcoal-500 transition-colors" />
              </div>
            </Link>

            {/* Draft Count */}
            <div className="h-28 rounded-xl bg-amber-50/50 border border-amber-100 p-4 flex flex-col justify-center">
              <p className="text-3xl font-semibold text-charcoal-900">{stats?.contentByStatus?.draft || 0}</p>
              <p className="text-sm text-amber-700">drafts pending</p>
            </div>

            {/* Platform Mix */}
            <div className="h-28 rounded-xl bg-gradient-to-br from-ocean-50 to-ocean-100 border border-ocean-200/50 p-4 flex flex-col justify-between">
              <p className="text-xs text-ocean-600 uppercase tracking-wide font-medium">Platforms</p>
              <div className="flex items-center gap-1">
                {Object.keys(stats?.contentByPlatform || {}).length > 0 ? (
                  Object.entries(stats?.contentByPlatform || {}).slice(0, 4).map(([platform, count]) => (
                    <div key={platform} className="w-8 h-8 rounded-lg bg-white/80 border border-ocean-200 flex items-center justify-center text-ocean-600" title={`${platform}: ${count}`}>
                      {PLATFORM_ICONS[platform]}
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-ocean-400">No content yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Recent Content Section */}
          <div className="rounded-2xl bg-white border border-charcoal-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-charcoal-100 flex items-center justify-between">
              <h2 className="font-medium text-charcoal-900">Recent Creations</h2>
              {hasContent && (
                <Link href="/creative-hub/gallery" className="text-sm text-ocean-600 hover:text-ocean-700 font-medium">
                  View all
                </Link>
              )}
            </div>

            {hasContent ? (
              <div className="divide-y divide-charcoal-50">
                {stats?.recentContent.slice(0, 5).map((content) => (
                  <div key={content.id} className="px-5 py-3 flex items-center gap-4 hover:bg-charcoal-50/50 transition-colors group">
                    {/* Thumbnail or Platform Icon */}
                    {content.image ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-charcoal-100 flex-shrink-0">
                        <img
                          src={content.image.imageUrl || `data:image/png;base64,${content.image.imageBase64}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-charcoal-100 flex items-center justify-center flex-shrink-0">
                        {PLATFORM_ICONS[content.platform]}
                      </div>
                    )}

                    {/* Content Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-charcoal-900 truncate">
                        {content.headline || content.primaryText.substring(0, 50)}
                      </p>
                      <p className="text-xs text-charcoal-400 mt-0.5">
                        {content.platform.replace('_', ' ')} · {new Date(content.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    {/* Actions - show on hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/creative-hub/gallery?view=${content.id}`}
                        className="p-1.5 rounded-lg hover:bg-charcoal-100 text-charcoal-400 hover:text-charcoal-600 transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/creative-hub/gallery?edit=${content.id}`}
                        className="p-1.5 rounded-lg hover:bg-charcoal-100 text-charcoal-400 hover:text-charcoal-600 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                    </div>

                    {/* Status */}
                    <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      content.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700'
                        : content.status === 'draft'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-charcoal-100 text-charcoal-600'
                    }`}>
                      {content.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ocean-100 to-bronze-100 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-ocean-600" />
                </div>
                <h3 className="text-lg font-medium text-charcoal-900 mb-2">Your creative canvas awaits</h3>
                <p className="text-charcoal-500 mb-6 max-w-sm mx-auto">
                  Generate scroll-stopping social posts and high-converting ads in seconds with AI.
                </p>
                <Link href="/creative-hub/create">
                  <Button className="bg-charcoal-900 hover:bg-charcoal-800 text-white">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start Creating
                  </Button>
                </Link>
              </div>
            )}
          </div>
      </div>
    </div>
  )
}
