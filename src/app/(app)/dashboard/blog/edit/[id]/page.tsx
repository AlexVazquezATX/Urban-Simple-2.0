'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  Sparkles,
  Wand2,
  Plus,
  RefreshCw,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Type,
  FileText,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { BlogPostWithRelations } from '@/lib/services/blog-service'
import type { BlogCategory } from '@prisma/client'
import { generateSlug, estimateReadingTime } from '@/lib/ai/blog-generator'

export default function BlogEditPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string

  const [post, setPost] = useState<BlogPostWithRelations | null>(null)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Editable fields
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft')

  // Image management
  const [showImageOptions, setShowImageOptions] = useState(false)
  const [customImageUrl, setCustomImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // AI enhancement states
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false)
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])

  // Preview mode
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    loadData()
  }, [postId])

  async function loadData() {
    try {
      setLoading(true)
      const [postRes, categoriesRes] = await Promise.all([
        fetch(`/api/blog/admin/posts/${postId}`),
        fetch('/api/blog/categories'),
      ])

      if (!postRes.ok) {
        throw new Error('Post not found')
      }

      const postData = await postRes.json()
      const categoriesData = await categoriesRes.json()

      setPost(postData)
      setCategories(categoriesData)

      // Initialize form fields
      setTitle(postData.title || '')
      setSlug(postData.slug || '')
      setExcerpt(postData.excerpt || '')
      setContent(postData.content || '')
      setCategoryId(postData.categoryId || '')
      setMetaTitle(postData.metaTitle || '')
      setMetaDescription(postData.metaDescription || '')
      setKeywords(postData.keywords || [])
      setFeaturedImage(postData.featuredImage || '')
      setStatus(postData.status || 'draft')
    } catch (error) {
      console.error('Failed to load post:', error)
      router.push('/dashboard/blog')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const readTime = estimateReadingTime(content)

      await fetch(`/api/blog/admin/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          excerpt,
          content,
          categoryId,
          metaTitle: metaTitle || title,
          metaDescription,
          keywords,
          featuredImage: featuredImage || null,
          status,
          readTime,
        }),
      })

      setHasChanges(false)
      // Reload to get fresh data
      await loadData()
    } catch (error) {
      console.error('Failed to save post:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    try {
      await fetch(`/api/blog/admin/posts/${postId}`, {
        method: 'DELETE',
      })
      router.push('/dashboard/blog')
    } catch (error) {
      console.error('Failed to delete post:', error)
      alert('Failed to delete post. Please try again.')
    }
  }

  async function handleTogglePublish() {
    const newStatus = status === 'published' ? 'draft' : 'published'
    setStatus(newStatus)
    setHasChanges(true)
  }

  // Image management handlers
  async function handleRegenerateImage() {
    setUploadingImage(true)
    try {
      const response = await fetch('/api/blog/admin/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'new_image',
          imagePrompt: `${title} ${excerpt} Austin restaurant food`,
        }),
      })
      const data = await response.json()
      setFeaturedImage(data.image)
      setHasChanges(true)
    } catch (error) {
      console.error('Failed to regenerate image:', error)
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'blog')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      setFeaturedImage(data.url)
      setShowImageOptions(false)
      setHasChanges(true)
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  function handleSetCustomUrl() {
    if (customImageUrl.trim()) {
      setFeaturedImage(customImageUrl.trim())
      setCustomImageUrl('')
      setShowImageOptions(false)
      setHasChanges(true)
    }
  }

  // AI enhancement handlers
  async function handleExpandContent() {
    setAiLoading('expand')
    try {
      const response = await fetch('/api/blog/admin/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'expand', content }),
      })
      const data = await response.json()
      setContent(data.content)
      setHasChanges(true)
    } catch (error) {
      console.error('Failed to expand content:', error)
      alert('Failed to expand content. Please try again.')
    } finally {
      setAiLoading(null)
    }
  }

  async function handleImproveWriting() {
    setAiLoading('improve')
    try {
      const response = await fetch('/api/blog/admin/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'improve', content }),
      })
      const data = await response.json()
      setContent(data.content)
      setHasChanges(true)
    } catch (error) {
      console.error('Failed to improve content:', error)
      alert('Failed to improve content. Please try again.')
    } finally {
      setAiLoading(null)
    }
  }

  async function handleGenerateTitles() {
    setAiLoading('titles')
    try {
      const response = await fetch('/api/blog/admin/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'title_options', content, currentTitle: title }),
      })
      const data = await response.json()
      setTitleSuggestions(data.titles || [])
      setShowTitleSuggestions(true)
    } catch (error) {
      console.error('Failed to generate titles:', error)
    } finally {
      setAiLoading(null)
    }
  }

  async function handleGenerateExcerpt() {
    setAiLoading('excerpt')
    try {
      const response = await fetch('/api/blog/admin/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'excerpt', content, title }),
      })
      const data = await response.json()
      setExcerpt(data.excerpt)
      setHasChanges(true)
    } catch (error) {
      console.error('Failed to generate excerpt:', error)
    } finally {
      setAiLoading(null)
    }
  }

  async function handleGenerateMetaDescription() {
    setAiLoading('meta')
    try {
      const response = await fetch('/api/blog/admin/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'meta_description', content, title }),
      })
      const data = await response.json()
      setMetaDescription(data.metaDescription)
      setHasChanges(true)
    } catch (error) {
      console.error('Failed to generate meta description:', error)
    } finally {
      setAiLoading(null)
    }
  }

  function handleAddKeyword() {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim().toLowerCase())) {
      setKeywords([...keywords, newKeyword.trim().toLowerCase()])
      setNewKeyword('')
      setHasChanges(true)
    }
  }

  function handleRemoveKeyword(keyword: string) {
    setKeywords(keywords.filter((k) => k !== keyword))
    setHasChanges(true)
  }

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!post?.slug || slug === generateSlug(post.title)) {
      setSlug(generateSlug(value))
    }
    setHasChanges(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-ocean-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-cream-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/dashboard/blog')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-cream-300" />
            <h1 className="text-xl font-semibold text-charcoal-900 truncate max-w-md">
              {title || 'Untitled Post'}
            </h1>
            {hasChanges && (
              <Badge variant="outline" className="border-bronze-500 text-bronze-700">
                Unsaved changes
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => window.open(`/blog/${slug}`, '_blank')}
              disabled={status !== 'published'}
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>

            <Button
              variant="outline"
              onClick={handleTogglePublish}
              className={
                status === 'published'
                  ? 'border-bronze-500 text-bronze-700 hover:bg-bronze-50'
                  : 'border-ocean-500 text-ocean-700 hover:bg-ocean-50'
              }
            >
              {status === 'published' ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Unpublish
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Publish
                </>
              )}
            </Button>

            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="bg-gradient-to-br from-ocean-500 to-ocean-600 hover:from-ocean-600 hover:to-ocean-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>

            <Button
              variant="outline"
              onClick={handleDelete}
              className="text-red-600 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Slug */}
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Title</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateTitles}
                      disabled={aiLoading === 'titles'}
                      className="text-xs"
                    >
                      {aiLoading === 'titles' ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Wand2 className="w-3 h-3 mr-1" />
                      )}
                      Suggest Titles
                    </Button>
                  </div>
                  <Input
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Enter post title..."
                    className="text-lg font-semibold"
                  />

                  {/* Title Suggestions Dialog */}
                  <Dialog open={showTitleSuggestions} onOpenChange={setShowTitleSuggestions}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Alternative Title Suggestions</DialogTitle>
                        <DialogDescription>
                          Click a title to use it
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        {titleSuggestions.map((suggestion, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              handleTitleChange(suggestion)
                              setShowTitleSuggestions(false)
                            }}
                            className="w-full text-left p-3 rounded-lg hover:bg-cream-50 border border-cream-200 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div>
                  <Label>URL Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-charcoal-500">/blog/</span>
                    <Input
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value)
                        setHasChanges(true)
                      }}
                      placeholder="url-slug"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Excerpt */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Label>Excerpt / Preview</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateExcerpt}
                  disabled={aiLoading === 'excerpt'}
                  className="text-xs"
                >
                  {aiLoading === 'excerpt' ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3 mr-1" />
                  )}
                  Generate
                </Button>
              </div>
              <Textarea
                value={excerpt}
                onChange={(e) => {
                  setExcerpt(e.target.value)
                  setHasChanges(true)
                }}
                placeholder="A compelling summary of your post..."
                rows={3}
              />
            </Card>

            {/* Content */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-semibold">Content</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExpandContent}
                    disabled={!!aiLoading}
                  >
                    {aiLoading === 'expand' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Make Longer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImproveWriting}
                    disabled={!!aiLoading}
                  >
                    {aiLoading === 'improve' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Improve Writing
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? 'Edit' : 'Preview'}
                  </Button>
                </div>
              </div>

              {showPreview ? (
                <div
                  className="prose prose-lg max-w-none p-4 bg-white rounded-lg border border-cream-200"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              ) : (
                <Textarea
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value)
                    setHasChanges(true)
                  }}
                  placeholder="Write your post content in HTML..."
                  rows={25}
                  className="font-mono text-sm"
                />
              )}
            </Card>
          </div>

          {/* Right Column - Meta & Image */}
          <div className="space-y-6">
            {/* Status */}
            <Card className="p-6">
              <Label className="mb-3 block">Status</Label>
              <div className="flex gap-2">
                <Badge
                  className={`cursor-pointer ${
                    status === 'draft'
                      ? 'bg-bronze-500 text-white'
                      : 'bg-cream-100 text-charcoal-600 hover:bg-cream-200'
                  }`}
                  onClick={() => {
                    setStatus('draft')
                    setHasChanges(true)
                  }}
                >
                  Draft
                </Badge>
                <Badge
                  className={`cursor-pointer ${
                    status === 'published'
                      ? 'bg-ocean-500 text-white'
                      : 'bg-cream-100 text-charcoal-600 hover:bg-cream-200'
                  }`}
                  onClick={() => {
                    setStatus('published')
                    setHasChanges(true)
                  }}
                >
                  Published
                </Badge>
                <Badge
                  className={`cursor-pointer ${
                    status === 'archived'
                      ? 'bg-charcoal-500 text-white'
                      : 'bg-cream-100 text-charcoal-600 hover:bg-cream-200'
                  }`}
                  onClick={() => {
                    setStatus('archived')
                    setHasChanges(true)
                  }}
                >
                  Archived
                </Badge>
              </div>
            </Card>

            {/* Featured Image */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Label>Featured Image</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImageOptions(!showImageOptions)}
                  className="text-xs"
                >
                  <ImageIcon className="w-3 h-3 mr-1" />
                  Change
                </Button>
              </div>

              {featuredImage ? (
                <div className="relative group">
                  <img
                    src={featuredImage}
                    alt={title}
                    className="w-full rounded-lg"
                  />
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-cream-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-charcoal-400">
                    <ImageIcon className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm">No image selected</p>
                  </div>
                </div>
              )}

              {/* Image Options Panel */}
              {showImageOptions && (
                <div className="mt-4 p-4 bg-cream-50 rounded-lg border border-cream-200 space-y-4">
                  <h4 className="text-sm font-semibold text-charcoal-900">Change Image</h4>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleRegenerateImage}
                    disabled={uploadingImage}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${uploadingImage ? 'animate-spin' : ''}`} />
                    Get Different Unsplash Image
                  </Button>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload from Computer
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Paste image URL..."
                        value={customImageUrl}
                        onChange={(e) => setCustomImageUrl(e.target.value)}
                        className="text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSetCustomUrl}
                        disabled={!customImageUrl.trim()}
                      >
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-charcoal-500"
                    onClick={() => setShowImageOptions(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </Card>

            {/* Category */}
            <Card className="p-6">
              <Label className="mb-3 block">Category</Label>
              <Select
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value)
                  setHasChanges(true)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color || '#A67C52' }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            {/* Keywords */}
            <Card className="p-6">
              <Label className="mb-3 block">Keywords / Tags</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {keywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="outline"
                    className="cursor-pointer hover:bg-red-50 hover:border-red-200"
                    onClick={() => handleRemoveKeyword(keyword)}
                  >
                    {keyword} ×
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Add keyword..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddKeyword()
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddKeyword}
                  disabled={!newKeyword.trim()}
                >
                  <Tag className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* SEO */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-semibold">SEO Settings</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateMetaDescription}
                  disabled={aiLoading === 'meta'}
                  className="text-xs"
                >
                  {aiLoading === 'meta' ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3 mr-1" />
                  )}
                  Generate
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-charcoal-500">Meta Title</Label>
                  <Input
                    value={metaTitle}
                    onChange={(e) => {
                      setMetaTitle(e.target.value)
                      setHasChanges(true)
                    }}
                    placeholder={title || 'Meta title (defaults to post title)'}
                  />
                  <p className="text-xs text-charcoal-400 mt-1">
                    {(metaTitle || title).length}/60 characters
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-charcoal-500">Meta Description</Label>
                  <Textarea
                    value={metaDescription}
                    onChange={(e) => {
                      setMetaDescription(e.target.value)
                      setHasChanges(true)
                    }}
                    placeholder="SEO description for search results..."
                    rows={3}
                  />
                  <p className="text-xs text-charcoal-400 mt-1">
                    {metaDescription.length}/160 characters
                  </p>
                </div>
              </div>
            </Card>

            {/* Post Info */}
            {post && (
              <Card className="p-6">
                <Label className="mb-3 block text-charcoal-500">Post Info</Label>
                <div className="space-y-2 text-sm text-charcoal-600">
                  <p>
                    <span className="font-medium">Created:</span>{' '}
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                  {post.publishedAt && (
                    <p>
                      <span className="font-medium">Published:</span>{' '}
                      {new Date(post.publishedAt).toLocaleDateString()}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Views:</span> {post.viewCount}
                  </p>
                  <p>
                    <span className="font-medium">Read Time:</span>{' '}
                    {estimateReadingTime(content)} min
                  </p>
                  {post.isAiGenerated && (
                    <Badge variant="outline" className="mt-2">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI Generated
                    </Badge>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
