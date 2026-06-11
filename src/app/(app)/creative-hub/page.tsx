'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Image as ImageIcon,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  Loader2,
  ArrowUpRight,
  Layers,
  Zap,
  Sun,
  Eye,
  Edit2,
  Camera,
  Package,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

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

function NavCard({
  href,
  icon: Icon,
  title,
  sub,
  count,
  primary,
}: {
  href: string
  icon: LucideIcon
  title: string
  sub: string
  count?: number
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-[14px] border p-4 transition-colors',
        primary
          ? 'bg-gold-600/10 border-gold-600/30 dark:bg-gold-400/12 dark:border-gold-400/25 hover:border-gold-600/50 dark:hover:border-gold-400/40'
          : 'bg-card border-border hover:border-gold-600/30 dark:hover:border-gold-400/25'
      )}
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-gold-600/10 dark:bg-gold-400/12">
        <Icon className="size-4 text-gold-600 dark:text-gold-400" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[15px] font-semibold tracking-[-0.2px] text-foreground">
          {title}
        </h2>
        <p className="truncate text-[13px] text-muted-foreground">{sub}</p>
      </div>
      {count != null && (
        <div className="font-display text-2xl font-bold tabular-nums tracking-[-0.5px] text-foreground">
          {count}
        </div>
      )}
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
    </Link>
  )
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
        fetch('/api/creative-hub/images?includeStats=true&limit=0'), // Just need the count
      ])

      const contentData = await contentResponse.json()
      const imagesData = await imagesResponse.json()

      setStats({
        totalContent: contentData.stats?.total || 0,
        contentByPlatform: contentData.stats?.byPlatform || {},
        contentByStatus: contentData.stats?.byStatus || {},
        totalImages: imagesData.stats?.total || imagesData.images?.length || 0,
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
      <div className="flex items-center justify-center min-h-[60vh] bg-background">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const hasContent = stats?.recentContent && stats.recentContent.length > 0

  return (
    <div>
      <PageHeader
        kicker="GROWTH · CREATIVE HUB"
        title="Creative Hub"
        subtitle="AI-powered content for Urban Simple"
        actions={
          <>
            <Badge variant="neutral">
              <span className="font-mono tabular-nums">{stats?.totalContent || 0}</span>
              created
            </Badge>
            <Badge variant="gold">
              <span className="font-mono tabular-nums">{stats?.contentByStatus?.approved || 0}</span>
              ready
            </Badge>
          </>
        }
      />

      {/* Nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <NavCard
          href="/creative-hub/generate"
          icon={Camera}
          title="Generate"
          sub="AI image creation"
          primary
        />
        <NavCard
          href="/creative-hub/images"
          icon={ImageIcon}
          title="Images"
          sub="Saved to library"
          count={stats?.totalImages || 0}
        />
        <NavCard
          href="/creative-hub/assets"
          icon={Package}
          title="Brand Assets"
          sub="Logos & objects"
        />
        <NavCard
          href="/creative-hub/create"
          icon={Sparkles}
          title="Create"
          sub="Generate posts"
        />
        <NavCard
          href="/creative-hub/gallery"
          icon={Layers}
          title="Gallery"
          sub="Browse & export"
          count={stats?.totalContent || 0}
        />
        <NavCard
          href="/creative-hub/inspiration"
          icon={Sun}
          title="Inspiration"
          sub="Trending ideas"
        />
      </div>

      {/* Recent Content Section */}
      <div className="rounded-[14px] bg-card border border-border">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-display text-[17px] font-semibold tracking-[-0.2px] text-foreground">
            Recent Creations
          </h2>
          {hasContent && (
            <Link
              href="/creative-hub/gallery"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          )}
        </div>

        {hasContent ? (
          <div className="p-4 space-y-1.5">
            {stats?.recentContent.slice(0, 5).map((content) => (
              <div
                key={content.id}
                className="px-3 py-2.5 rounded-[10px] border border-border hover:border-gold-600/30 dark:hover:border-gold-400/25 transition-colors flex items-center gap-3 group"
              >
                {/* Thumbnail or Platform Icon */}
                {content.image ? (
                  <div className="w-10 h-10 rounded-[8px] overflow-hidden bg-secondary shrink-0">
                    <img
                      src={content.image.imageUrl || `data:image/png;base64,${content.image.imageBase64}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-[8px] bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                    {PLATFORM_ICONS[content.platform]}
                  </div>
                )}

                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {content.headline || content.primaryText.substring(0, 50)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="capitalize">{content.platform.replace('_', ' ')}</span>
                    {' · '}
                    <span className="font-mono tabular-nums">
                      {new Date(content.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </p>
                </div>

                {/* Actions - show on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/creative-hub/gallery?view=${content.id}`}
                    className="p-1.5 rounded-[8px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    title="View"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/creative-hub/gallery?edit=${content.id}`}
                    className="p-1.5 rounded-[8px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Status */}
                <Badge variant={content.status === 'approved' ? 'green' : 'neutral'} className="capitalize">
                  {content.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="Your creative canvas awaits"
            description="Generate social posts and ads in seconds with AI."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href="/creative-hub/create">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Start Creating
                </Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  )
}
