'use client'

import { useState, useEffect } from 'react'
import { Plus, Sparkles, Eye, EyeOff, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AIGenerationWizard } from './ai-generation-wizard'
import type { BlogPostWithRelations } from '@/lib/services/blog-service'
import type { BlogCategory } from '@prisma/client'

export default function BlogManagementPage() {
  const [posts, setPosts] = useState<BlogPostWithRelations[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [selectedPost, setSelectedPost] = useState<BlogPostWithRelations | null>(null)

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
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      await fetch(`/api/blog/admin/posts/${post.id}`, {
        method: 'DELETE',
      })

      await loadData()
    } catch (error) {
      console.error('Failed to delete post:', error)
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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-warm-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-medium tracking-tight text-warm-900">Blog Management</h1>
          <p className="text-sm text-warm-500 mt-0.5">
            Create engaging Austin content with AI
          </p>
        </div>
        <Button
          onClick={() => setShowWizard(true)}
          variant="lime"
          size="sm"
          className="rounded-sm"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          <span className="hidden sm:inline">Generate New Post</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-warm-400">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Total Posts</div>
          <div className="text-2xl font-semibold text-warm-900">{posts.length}</div>
          <p className="text-xs text-warm-500 mt-1">All blog content</p>
        </Card>
        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-ocean-500">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Published</div>
          <div className="text-2xl font-semibold text-ocean-600">
            {posts.filter((p) => p.status === 'published').length}
          </div>
          <p className="text-xs text-warm-500 mt-1">Live on site</p>
        </Card>
        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-lime-500">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Drafts</div>
          <div className="text-2xl font-semibold text-lime-600">
            {posts.filter((p) => p.status === 'draft').length}
          </div>
          <p className="text-xs text-warm-500 mt-1">Pending review</p>
        </Card>
        <Card className="p-4 rounded-sm border-warm-200 border-l-4 border-l-plum-500">
          <div className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-1">Total Views</div>
          <div className="text-2xl font-semibold text-plum-600">
            {posts.reduce((sum, p) => sum + p.viewCount, 0).toLocaleString()}
          </div>
          <p className="text-xs text-warm-500 mt-1">All-time reads</p>
        </Card>
      </div>

      {/* Posts List */}
      <Card className="rounded-sm border-warm-200">
        <div className="px-4 py-3 border-b border-warm-200">
          <h2 className="text-base font-display font-medium text-warm-900">All Posts</h2>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-warm-500 text-sm">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 rounded-sm bg-lime-100 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-5 h-5 text-lime-600" />
            </div>
            <h3 className="text-sm font-medium text-warm-900 mb-1">
              No posts yet
            </h3>
            <p className="text-xs text-warm-500 mb-4 max-w-sm mx-auto">
              Create your first Austin blog post with AI
            </p>
            <Button
              onClick={() => setShowWizard(true)}
              variant="lime"
              size="sm"
              className="rounded-sm"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Generate Your First Post
            </Button>
          </div>
        ) : (
          <div className="p-4 space-y-1.5">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-sm border border-warm-200 hover:border-ocean-400 transition-colors group"
              >
                {/* Featured Image */}
                {post.featuredImage && (
                  <div className="w-16 h-16 rounded-sm overflow-hidden bg-warm-100 shrink-0">
                    <img
                      src={post.featuredImage}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Badge
                      className="rounded-sm text-[10px] px-1.5 py-0"
                      style={{
                        backgroundColor: post.category?.color || '#A67C52',
                        color: 'white',
                      }}
                    >
                      {post.category?.name || 'Uncategorized'}
                    </Badge>
                    {post.status === 'published' ? (
                      <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-ocean-500 text-ocean-700">
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-400 text-warm-600">
                        Draft
                      </Badge>
                    )}
                    {post.isAiGenerated && (
                      <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-plum-500 text-plum-700">
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                        AI
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-warm-900 truncate">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-warm-500">
                    <span>
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString()
                        : new Date(post.createdAt).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>{post.viewCount} views</span>
                    {post.readTime && (
                      <>
                        <span>•</span>
                        <span>{post.readTime} min</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions - show on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => window.location.href = `/dashboard/blog/edit/${post.id}`}
                    className="p-1.5 rounded-sm hover:bg-warm-100 text-warm-500 hover:text-ocean-600 transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handlePublish(post)}
                    className="p-1.5 rounded-sm hover:bg-warm-100 text-warm-500 hover:text-ocean-600 transition-colors"
                    title={post.status === 'published' ? 'Unpublish' : 'Publish'}
                  >
                    {post.status === 'published' ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                    className="p-1.5 rounded-sm hover:bg-warm-100 text-warm-500 hover:text-ocean-600 transition-colors"
                    title="Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(post)}
                    className="p-1.5 rounded-sm hover:bg-warm-100 text-warm-500 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
