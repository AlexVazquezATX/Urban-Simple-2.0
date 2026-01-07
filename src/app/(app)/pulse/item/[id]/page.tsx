import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ExternalLink, Calendar, Sparkles, Share2, Twitter, Linkedin, Clock, Tag } from 'lucide-react'
import { PulseItemActions } from '@/components/pulse/pulse-item-actions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PulseItemPage({ params }: PageProps) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'SUPER_ADMIN') {
    redirect('/')
  }

  const item = await prisma.pulseBriefingItem.findUnique({
    where: { id },
    include: {
      topic: {
        select: {
          id: true,
          name: true,
          category: true,
          keywords: true,
        },
      },
      briefing: {
        select: {
          id: true,
          date: true,
          userId: true,
        },
      },
    },
  })

  if (!item || item.briefing.userId !== user.id) {
    notFound()
  }

  // Mark as read
  if (!item.isRead) {
    await prisma.pulseBriefingItem.update({
      where: { id },
      data: { isRead: true },
    })
  }

  // Get related items from the same briefing for "Read Next"
  const relatedItems = await prisma.pulseBriefingItem.findMany({
    where: {
      briefingId: item.briefingId,
      id: { not: item.id },
      itemType: 'article',
    },
    take: 3,
    orderBy: { sortOrder: 'asc' },
    include: {
      topic: {
        select: {
          name: true,
        },
      },
    },
  })

  // Generate gradient based on category
  const gradients: Record<string, string> = {
    tech: 'from-blue-600 via-indigo-600 to-purple-700',
    business: 'from-emerald-600 via-teal-600 to-cyan-700',
    local: 'from-orange-500 via-amber-500 to-yellow-600',
    industry: 'from-rose-600 via-pink-600 to-fuchsia-700',
    personal: 'from-violet-600 via-purple-600 to-indigo-700',
    general: 'from-slate-600 via-gray-600 to-zinc-700',
  }

  const gradient = gradients[item.category || 'general'] || gradients.general

  // Estimate read time (average 200 words per minute)
  const wordCount = (item.content?.split(/\s+/).length || 0) + (item.summary?.split(/\s+/).length || 0)
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Image */}
      <div className={`relative h-[50vh] min-h-[400px] bg-gradient-to-br ${gradient}`}>
        {item.imageBase64 ? (
          <img
            src={`data:image/png;base64,${item.imageBase64}`}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-32 w-32 text-white/20" />
          </div>
        )}

        {/* Overlay gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />

        {/* Top navigation bar */}
        <div className="absolute top-0 left-0 right-0 p-6 z-10 flex justify-between items-center">
          <Link href="/pulse">
            <Button variant="secondary" size="sm" className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pulse
            </Button>
          </Link>
          <PulseItemActions itemId={item.id} isBookmarked={item.isBookmarked} />
        </div>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {item.topic && (
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-3 py-1 text-sm">
                  {item.topic.name}
                </Badge>
              )}
              {item.sentiment === 'positive' && (
                <Badge className="bg-green-500/30 text-green-100 border-green-400/30 backdrop-blur-sm">
                  Positive Outlook
                </Badge>
              )}
              {item.sentiment === 'negative' && (
                <Badge className="bg-red-500/30 text-red-100 border-red-400/30 backdrop-blur-sm">
                  Attention Required
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-white leading-tight mb-6">
              {item.title}
            </h1>
            <p className="text-lg md:text-xl text-white/80 font-serif italic max-w-3xl">
              {item.summary}
            </p>
          </div>
        </div>

        {/* Image caption */}
        {item.imageBase64 && (
          <div className="absolute bottom-4 right-4 text-white/60 text-xs backdrop-blur-sm bg-black/30 px-2 py-1 rounded">
            Visual by Gemini AI
          </div>
        )}
      </div>

      {/* Main Content Area - Two Column Layout */}
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content - 8 columns */}
          <article className="lg:col-span-8">
            {/* Meta info bar */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-6 border-b">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(item.briefing.date), 'MMMM d, yyyy')}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {readTime} min read
              </div>
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline ml-auto"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Original Source
                </a>
              )}
            </div>

            {/* Article content with custom magazine-quality typography */}
            {item.content && (
              <div
                className="pulse-article-content"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            )}

            {/* Tags section */}
            {item.topic?.keywords && item.topic.keywords.length > 0 && (
              <div className="mt-12 pt-8 border-t">
                <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span className="text-sm font-medium">Related Topics</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.topic.keywords.slice(0, 6).map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="px-3 py-1">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom navigation */}
            <div className="mt-12 pt-8 border-t flex flex-wrap items-center justify-between gap-4">
              <Link href="/pulse">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Today's Briefing
                </Button>
              </Link>

              <Link href="/pulse/archive">
                <Button variant="ghost">
                  View Archive
                </Button>
              </Link>
            </div>
          </article>

          {/* Sidebar - 4 columns */}
          <aside className="lg:col-span-4">
            {/* Author/AI info widget */}
            <div className="bg-muted/30 rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Pulse AI</p>
                  <p className="text-sm text-muted-foreground">Your Daily Intelligence</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This article was curated and synthesized by Pulse AI based on your interests and the latest developments in {item.topic?.name || 'this area'}.
              </p>
              <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">Share:</span>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Read Next section */}
            {relatedItems.length > 0 && (
              <div className="bg-muted/30 rounded-2xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="text-lg">Read Next</span>
                </h3>
                <div className="space-y-4">
                  {relatedItems.map((related) => (
                    <Link
                      key={related.id}
                      href={`/pulse/item/${related.id}`}
                      className="block group"
                    >
                      <div className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                        {related.topic && (
                          <p className="text-xs text-primary mb-1 uppercase tracking-wide">
                            {related.topic.name}
                          </p>
                        )}
                        <h4 className="font-medium text-sm leading-snug group-hover:text-primary transition-colors">
                          {related.title}
                        </h4>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Why This Matters box */}
            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 uppercase tracking-wide">
                <Sparkles className="h-4 w-4 text-primary" />
                Why This Matters
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This insight connects to broader trends affecting your business. Understanding these developments helps you make informed decisions and stay ahead of the competition.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
