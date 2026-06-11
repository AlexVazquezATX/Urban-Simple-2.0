'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Camera,
  Sparkles,
  ImageIcon,
  Layers,
  Loader2,
  TrendingUp,
  Calendar,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

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

/* Gold/peach pastel action tile — pastel fill + 1px line border + deep-tone
   icon circle + display title + arrow top-right. Dark mode swaps the pastel
   for the dim/line accent recipe. */
function ActionTile({
  href,
  icon: Icon,
  title,
  sub,
  tone,
}: {
  href: string
  icon: LucideIcon
  title: string
  sub: string
  tone: 'gold' | 'peach'
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative block rounded-[18px] border p-5 transition-colors',
        tone === 'gold'
          ? 'bg-gold-100 border-gold-200 hover:border-gold-600/50 dark:bg-gold-400/12 dark:border-gold-400/25 dark:hover:border-gold-400/40'
          : 'bg-peach-bg border-peach-line hover:border-peach-deep/50 dark:bg-coral-300/12 dark:border-coral-300/25 dark:hover:border-coral-300/40'
      )}
    >
      <div className="mb-5 grid size-[42px] place-items-center rounded-full bg-white/75 dark:bg-white/10">
        <Icon
          className={cn(
            'size-[18px]',
            tone === 'gold'
              ? 'text-gold-700 dark:text-gold-400'
              : 'text-peach-deep dark:text-coral-300'
          )}
        />
      </div>
      <h2
        className={cn(
          'font-display text-lg font-bold tracking-[-0.4px]',
          tone === 'gold' ? 'text-gold-700 dark:text-gold-400' : 'text-peach-deep dark:text-coral-300'
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          'mt-0.5 text-[12.5px]',
          tone === 'gold'
            ? 'text-gold-700/80 dark:text-gold-400/80'
            : 'text-peach-deep/80 dark:text-coral-300/80'
        )}
      >
        {sub}
      </p>
      <ArrowUpRight
        className={cn(
          'absolute right-5 top-5 size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5',
          tone === 'gold' ? 'text-gold-700 dark:text-gold-400' : 'text-peach-deep dark:text-coral-300'
        )}
      />
    </Link>
  )
}

/* Quick tile per the nav-card spec — soft-gold icon tile + title + 13px sub
   + display-font count + ghost arrow when the whole card is a link. */
function QuickTile({
  href,
  icon: Icon,
  title,
  sub,
  count,
}: {
  href?: string
  icon: LucideIcon
  title: string
  sub: string
  count?: number
}) {
  const inner = (
    <>
      <div className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-gold-600/10 dark:bg-gold-400/12">
        <Icon className="size-4 text-gold-600 dark:text-gold-400" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-[15px] font-semibold tracking-[-0.2px] text-foreground">
          {title}
        </h3>
        <p className="truncate text-[13px] text-muted-foreground">{sub}</p>
      </div>
      {count != null && (
        <div className="font-display text-2xl font-bold tabular-nums tracking-[-0.5px] text-foreground">
          {count}
        </div>
      )}
      {href && (
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
      )}
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="group flex items-center gap-3 rounded-[14px] border border-border bg-card p-4 transition-colors hover:border-gold-600/30 dark:hover:border-gold-400/25"
      >
        {inner}
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-4">
      {inner}
    </div>
  )
}

export default function CreativeStudioPage() {
  const [stats, setStats] = useState<StudioStats | null>(null)
  const [recentContent, setRecentContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const hasContent = recentContent.length > 0

  return (
    <div>
      <PageHeader
        kicker="STUDIO · BACKHAUS"
        title="Creative Studio"
        subtitle="Professional food photography & branded content"
        actions={
          <>
            <Badge variant="neutral">
              <span className="font-mono tabular-nums">{stats?.totalGenerations || 0}</span>
              generated
            </Badge>
            <Badge variant="gold">
              <span className="font-mono tabular-nums">{stats?.savedContent || 0}</span>
              saved
            </Badge>
          </>
        }
      />

      {/* Action tiles - main CTAs */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <ActionTile
          href="/creative-studio/generate?mode=food_photo"
          icon={Camera}
          title="Food Photography"
          sub="Transform dish photos into professional images"
          tone="gold"
        />
        <ActionTile
          href="/creative-studio/generate?mode=branded_post"
          icon={Sparkles}
          title="Branded Posts"
          sub="Create promotional graphics with your brand"
          tone="peach"
        />
      </div>

      {/* Quick nav tiles */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <QuickTile
          href="/creative-studio/gallery"
          icon={Layers}
          title="Gallery"
          sub="Browse saved"
        />
        <QuickTile
          href="/creative-studio/brand-kit"
          icon={ImageIcon}
          title="Brand Kit"
          sub="Colors & logo"
        />
        <QuickTile
          icon={Calendar}
          title="This Month"
          sub="created"
          count={stats?.thisMonthGenerations || 0}
        />
        <QuickTile
          icon={TrendingUp}
          title="Food Photos"
          sub="generated"
          count={stats?.generationsByMode?.food_photo || 0}
        />
      </div>

      {/* Recent Content Section */}
      <div className="rounded-[14px] border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-[17px] font-semibold tracking-[-0.2px] text-foreground">
            Recent Creations
          </h2>
          {hasContent && (
            <Link
              href="/creative-studio/gallery"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          )}
        </div>

        {hasContent ? (
          <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-3">
            {recentContent.map((item) => (
              <Link
                key={item.id}
                href={`/creative-studio/gallery?view=${item.id}`}
                className="group"
              >
                <div className="overflow-hidden rounded-[14px] border border-border transition-colors hover:border-gold-600/30 dark:hover:border-gold-400/25">
                  {/* Image Preview */}
                  <div className="relative aspect-square bg-secondary">
                    {item.hasImage ? (
                      <img
                        src={`/api/creative-studio/content/image?id=${item.id}`}
                        alt={item.headline || 'Generated image'}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="size-8 text-muted-foreground/50" />
                      </div>
                    )}
                    {/* Mode chip - neutral; the photography provides the color */}
                    <Badge variant="neutral" className="absolute left-2 top-2">
                      {item.mode === 'food_photo' ? 'Food' : 'Branded'}
                    </Badge>
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    <p className="truncate text-xs font-medium text-foreground">
                      {item.headline || item.outputFormat || 'Untitled'}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
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
          <EmptyState
            icon={Camera}
            title="Nothing here yet, and that's easy to fix"
            description="Transform your dish photos or generate branded graphics in seconds."
            action={
              <Link href="/creative-studio/generate">
                <Button variant="gold" size="sm">
                  <Sparkles className="size-3.5" />
                  Create Your First Image
                </Button>
              </Link>
            }
          />
        )}
      </div>
    </div>
  )
}
