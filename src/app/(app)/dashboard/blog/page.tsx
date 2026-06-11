'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  MoreHorizontal,
  FileText,
  CheckCircle2,
  PenLine,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AIGenerationWizard } from './ai-generation-wizard'
import type { BlogPostWithRelations } from '@/lib/services/blog-service'
import type { BlogCategory } from '@prisma/client'

export default function BlogManagementPage() {
  const [posts, setPosts] = useState<BlogPostWithRelations[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [selectedPost, setSelectedPost] = useState<BlogPostWithRelations | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BlogPostWithRelations | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [postsRes, categoriesRes] = await Promise.all([
        fetch('/api/blog/admin/posts'),
        fetch('/api/blog/categories'),
      ])

      const postsData = await postsRes.json()
      const categoriesData = await categoriesRes.json()

      setPosts(postsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Failed to load blog data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handlePublish(post: BlogPostWithRelations) {
    try {
      const newStatus = post.status === 'published' ? 'draft' : 'published'
      await fetch(`/api/blog/admin/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      await loadData()
    } catch (error) {
      console.error('Failed to update post status:', error)
    }
  }

  async function handleDelete(post: BlogPostWithRelations) {
    try {
      await fetch(`/api/blog/admin/posts/${post.id}`, {
        method: 'DELETE',
      })

      await loadData()
    } catch (error) {
      console.error('Failed to delete post:', error)
    } finally {
      setDeleteTarget(null)
    }
  }

  function handleWizardComplete() {
    setShowWizard(false)
    loadData()
  }

  if (showWizard) {
    return (
      <AIGenerationWizard
        categories={categories}
        onComplete={handleWizardComplete}
        onCancel={() => setShowWizard(false)}
      />
    )
  }

  const publishedCount = posts.filter((p) => p.status === 'published').length
  const draftCount = posts.filter((p) => p.status === 'draft').length
  const totalViews = posts.reduce((sum, p) => sum + p.viewCount, 0)

  return (
    <div>
      <PageHeader
        kicker="GROWTH · CONTENT"
        title="Blog Management"
        subtitle="Create engaging Austin content with AI"
        actions={
          <Button onClick={() => setShowWizard(true)} variant="gold" size="sm">
            <Sparkles className="size-4" />
            <span className="hidden sm:inline">Generate New Post</span>
            <span className="sm:hidden">Generate</span>
          </Button>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total Posts"
          value={posts.length}
          sub="All blog content"
          icon={FileText}
        />
        <StatCard
          label="Published"
          value={publishedCount}
          sub="Live on site"
          icon={CheckCircle2}
        />
        <StatCard
          label="Drafts"
          value={draftCount}
          sub="Pending review"
          icon={PenLine}
        />
        <StatCard
          label="Total Views"
          value={totalViews.toLocaleString()}
          sub="All-time reads"
          icon={Eye}
        />
      </div>

      {/* Posts List */}
      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle>All Posts</CardTitle>
        </CardHeader>

        <CardContent className="px-5">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading posts...</p>
          ) : posts.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No posts yet"
              description="Generate your first Austin post with AI. It takes about a minute from idea to draft."
              action={
                <Button onClick={() => setShowWizard(true)} variant="outline" size="sm">
                  <Sparkles className="size-4" />
                  Generate Your First Post
                </Button>
              }
            />
          ) : (
            <div className="space-y-1.5">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="group flex items-center gap-3 rounded-[10px] border border-border px-3 py-2.5 transition-colors hover:bg-secondary/50"
                >
                  {/* Featured Image */}
                  {post.featuredImage && (
                    <div className="size-14 shrink-0 overflow-hidden rounded-[8px] bg-secondary">
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="neutral">{post.category?.name || 'Uncategorized'}</Badge>
                      {post.status === 'published' ? (
                        <Badge variant="teal">Published</Badge>
                      ) : (
                        <Badge variant="neutral">Draft</Badge>
                      )}
                      {post.isAiGenerated && (
                        <Badge variant="gold">
                          <Sparkles />
                          AI
                        </Badge>
                      )}
                    </div>
                    <h3 className="truncate text-sm font-medium text-foreground">{post.title}</h3>
                    <div className="mt-0.5 flex items-center gap-2 font-mono text-xs tabular-nums text-muted-foreground">
                      <span>
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString()
                          : new Date(post.createdAt).toLocaleDateString()}
                      </span>
                      <span>·</span>
                      <span>{post.viewCount} views</span>
                      {post.readTime && (
                        <>
                          <span>·</span>
                          <span>{post.readTime} min</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                    >
                      View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="More actions">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => (window.location.href = `/dashboard/blog/edit/${post.id}`)}
                        >
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePublish(post)}>
                          {post.status === 'published' ? (
                            <>
                              <EyeOff className="size-4" />
                              Unpublish
                            </>
                          ) : (
                            <>
                              <Eye className="size-4" />
                              Publish
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteTarget(post)}>
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently removed from the blog. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              <Trash2 className="size-4" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
