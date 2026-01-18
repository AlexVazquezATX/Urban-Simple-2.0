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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-charcoal-900">Blog Management</h1>
          <p className="text-charcoal-600 mt-1">
            Create engaging Austin content with AI
          </p>
        </div>
        <Button
          onClick={() => setShowWizard(true)}
          className="bg-gradient-to-br from-ocean-500 to-ocean-600 hover:from-ocean-600 hover:to-ocean-700"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Generate New Post
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="text-sm text-charcoal-600 mb-1">Total Posts</div>
          <div className="text-3xl font-bold text-charcoal-900">{posts.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-charcoal-600 mb-1">Published</div>
          <div className="text-3xl font-bold text-ocean-600">
            {posts.filter((p) => p.status === 'published').length}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-charcoal-600 mb-1">Drafts</div>
          <div className="text-3xl font-bold text-bronze-600">
            {posts.filter((p) => p.status === 'draft').length}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-charcoal-600 mb-1">Total Views</div>
          <div className="text-3xl font-bold text-plum-600">
            {posts.reduce((sum, p) => sum + p.viewCount, 0)}
          </div>
        </Card>
      </div>

      {/* Posts List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-charcoal-900 mb-4">All Posts</h2>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-charcoal-600">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 mx-auto text-charcoal-300 mb-4" />
            <h3 className="text-xl font-semibold text-charcoal-900 mb-2">
              No posts yet
            </h3>
            <p className="text-charcoal-600 mb-6">
              Create your first Austin blog post with AI
            </p>
            <Button
              onClick={() => setShowWizard(true)}
              className="bg-gradient-to-br from-ocean-500 to-ocean-600 hover:from-ocean-600 hover:to-ocean-700"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Your First Post
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-cream-200 hover:border-ocean-200 transition-colors"
              >
                {/* Featured Image */}
                {post.featuredImage && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-cream-100 flex-shrink-0">
                    <img
                      src={post.featuredImage}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      style={{
                        backgroundColor: post.category?.color || '#A67C52',
                        color: 'white',
                      }}
                    >
                      {post.category?.name || 'Uncategorized'}
                    </Badge>
                    {post.status === 'published' ? (
                      <Badge variant="outline" className="border-ocean-500 text-ocean-700">
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-bronze-500 text-bronze-700">
                        Draft
                      </Badge>
                    )}
                    {post.isAiGenerated && (
                      <Badge variant="outline" className="border-plum-500 text-plum-700">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI Generated
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-charcoal-900 truncate mb-1">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-charcoal-600">
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
                        <span>{post.readTime} min read</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = `/dashboard/blog/edit/${post.id}`}
                    className="text-ocean-600 hover:bg-ocean-50"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePublish(post)}
                  >
                    {post.status === 'published' ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-1" />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-1" />
                        Publish
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(post)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
