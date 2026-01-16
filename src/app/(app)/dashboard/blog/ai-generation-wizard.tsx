'use client'

import { useState, useRef } from 'react'
import { ArrowLeft, Sparkles, Loader2, Check, Upload, RefreshCw, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { BlogCategory } from '@prisma/client'
import { CONTENT_FOCUS_TYPES, BLOG_CATEGORIES, generateSlug, estimateReadingTime } from '@/lib/ai/blog-generator'

interface AIGenerationWizardProps {
  categories: BlogCategory[]
  onComplete: () => void
  onCancel: () => void
}

interface BlogIdea {
  title: string
  angle: string
  hook: string
  keywords: string[]
}

interface GeneratedPost {
  title: string
  excerpt: string
  content: string
  keywords: string[]
  metaDescription: string
  readTime: number
  imagePrompt: string
}

export function AIGenerationWizard({ categories, onComplete, onCancel }: AIGenerationWizardProps) {
  const [step, setStep] = useState<'params' | 'ideas' | 'generating' | 'review'>('params')
  const [loading, setLoading] = useState(false)

  // Step 1: Parameters
  const [params, setParams] = useState({
    targetArea: 'Austin, TX',
    category: '',
    contentFocus: '',
    targetAudience: 'Foodies and Austin Residents',
    tone: 'Fun and Informative',
  })

  // Step 2: Generated Ideas
  const [ideas, setIdeas] = useState<BlogIdea[]>([])
  const [selectedIdea, setSelectedIdea] = useState<BlogIdea | null>(null)

  // Step 3: Generated Post
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null)
  const [featuredImage, setFeaturedImage] = useState<string | null>(null)

  // Step 4: Editable fields
  const [editedPost, setEditedPost] = useState<any>(null)
  const [showImageOptions, setShowImageOptions] = useState(false)
  const [customImageUrl, setCustomImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleGenerateIdeas() {
    if (!params.category || !params.contentFocus) {
      alert('Please select a category and content focus')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/blog/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ideas',
          ...params,
        }),
      })

      const data = await response.json()
      setIdeas(data.ideas)
      setStep('ideas')
    } catch (error) {
      console.error('Failed to generate ideas:', error)
      alert('Failed to generate ideas. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectIdea(idea: BlogIdea) {
    setSelectedIdea(idea)
    setStep('generating')
    setLoading(true)

    try {
      // Generate post content
      const postResponse = await fetch('/api/blog/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post',
          ...params,
          selectedIdea: idea,
        }),
      })

      const postData = await postResponse.json()
      setGeneratedPost(postData.post)

      // Generate featured image
      const imageResponse = await fetch('/api/blog/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'image',
          imagePrompt: postData.post.imagePrompt,
        }),
      })

      const imageData = await imageResponse.json()
      setFeaturedImage(imageData.image)

      // Initialize editable post
      setEditedPost({
        title: postData.post.title,
        excerpt: postData.post.excerpt,
        content: postData.post.content,
        keywords: postData.post.keywords,
        metaDescription: postData.post.metaDescription,
        readTime: postData.post.readTime,
      })

      setStep('review')
    } catch (error) {
      console.error('Failed to generate post:', error)
      alert('Failed to generate post. Please try again.')
      setStep('ideas')
    } finally {
      setLoading(false)
    }
  }

  // Regenerate image with a new random selection
  async function handleRegenerateImage() {
    if (!generatedPost) return
    setUploadingImage(true)
    try {
      const imageResponse = await fetch('/api/blog/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'image',
          imagePrompt: generatedPost.imagePrompt,
        }),
      })
      const imageData = await imageResponse.json()
      setFeaturedImage(imageData.image)
    } catch (error) {
      console.error('Failed to regenerate image:', error)
      alert('Failed to regenerate image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  // Handle file upload
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

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      setFeaturedImage(data.url)
      setShowImageOptions(false)
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  // Handle custom URL
  function handleSetCustomUrl() {
    if (customImageUrl.trim()) {
      setFeaturedImage(customImageUrl.trim())
      setCustomImageUrl('')
      setShowImageOptions(false)
    }
  }

  async function handlePublish(status: 'draft' | 'published') {
    if (!editedPost || !selectedIdea) return

    setLoading(true)
    try {
      const categoryId = categories.find((c) => c.name === params.category)?.id

      await fetch('/api/blog/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editedPost.title,
          slug: generateSlug(editedPost.title),
          excerpt: editedPost.excerpt,
          content: editedPost.content,
          categoryId,
          metaTitle: editedPost.title,
          metaDescription: editedPost.metaDescription,
          keywords: editedPost.keywords,
          featuredImage: featuredImage || undefined,
          featuredImagePrompt: generatedPost?.imagePrompt,
          imageAltText: editedPost.title,
          status,
          readTime: editedPost.readTime,
          isAiGenerated: true,
          aiModel: 'gemini-2.0-flash-exp',
          aiGenerationData: {
            params,
            selectedIdea,
          },
          targetArea: params.targetArea,
          contentFocus: params.contentFocus,
          targetAudience: params.targetAudience,
          tone: params.tone,
        }),
      })

      onComplete()
    } catch (error) {
      console.error('Failed to save post:', error)
      alert('Failed to save post. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 1: Parameters
  if (step === 'params') {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Button variant="ghost" onClick={onCancel} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Posts
        </Button>

        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-ocean-100 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-ocean-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-charcoal-900">AI Blog Generator</h2>
              <p className="text-charcoal-600">Create engaging Austin content in minutes</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Label>Target Area</Label>
              <Input
                value={params.targetArea}
                onChange={(e) => setParams({ ...params, targetArea: e.target.value })}
                placeholder="Austin, TX"
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={params.category}
                onValueChange={(value) => setParams({ ...params, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {BLOG_CATEGORIES && Object.values(BLOG_CATEGORIES).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Content Focus</Label>
              <Select
                value={params.contentFocus}
                onValueChange={(value) => setParams({ ...params, contentFocus: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="What should this post be about?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CONTENT_FOCUS_TYPES.NEW_OPENINGS}>
                    New Restaurant/Hotel Openings
                  </SelectItem>
                  <SelectItem value={CONTENT_FOCUS_TYPES.UPCOMING_EVENTS}>
                    Upcoming Events
                  </SelectItem>
                  <SelectItem value={CONTENT_FOCUS_TYPES.BEST_OF_LISTS}>
                    "Best Of" Lists
                  </SelectItem>
                  <SelectItem value={CONTENT_FOCUS_TYPES.FOOD_SCENE}>
                    Food Scene Coverage
                  </SelectItem>
                  <SelectItem value={CONTENT_FOCUS_TYPES.INDUSTRY_INSIGHTS}>
                    Industry Insights
                  </SelectItem>
                  <SelectItem value={CONTENT_FOCUS_TYPES.LOCAL_CULTURE}>
                    Local Culture & Lifestyle
                  </SelectItem>
                  <SelectItem value={CONTENT_FOCUS_TYPES.HOSPITALITY_TIPS}>
                    Hospitality Tips
                  </SelectItem>
                  <SelectItem value={CONTENT_FOCUS_TYPES.POP_CULTURE}>
                    Pop Culture
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Target Audience</Label>
              <Input
                value={params.targetAudience}
                onChange={(e) => setParams({ ...params, targetAudience: e.target.value })}
                placeholder="e.g., Foodies, Industry Professionals, Austin Residents"
              />
            </div>

            <div>
              <Label>Tone & Style</Label>
              <Input
                value={params.tone}
                onChange={(e) => setParams({ ...params, tone: e.target.value })}
                placeholder="e.g., Buzzy and Insider-y, Professional, Fun"
              />
            </div>

            <Button
              onClick={handleGenerateIdeas}
              disabled={loading || !params.category || !params.contentFocus}
              className="w-full bg-gradient-to-br from-ocean-500 to-ocean-600 hover:from-ocean-600 hover:to-ocean-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Ideas...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Post Ideas
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Step 2: Select Idea
  if (step === 'ideas') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setStep('params')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Parameters
        </Button>

        <h2 className="text-2xl font-bold text-charcoal-900 mb-6">
          Select a Post Idea
        </h2>

        <div className="grid gap-4">
          {ideas && ideas.map((idea, index) => (
            <Card
              key={index}
              className="p-6 cursor-pointer hover:border-ocean-500 hover:shadow-md transition-all"
              onClick={() => handleSelectIdea(idea)}
            >
              <h3 className="text-xl font-semibold text-charcoal-900 mb-2">
                {idea.title}
              </h3>
              <p className="text-charcoal-600 mb-3">
                <strong>Angle:</strong> {idea.angle}
              </p>
              <p className="text-charcoal-600 mb-3">
                <strong>Hook:</strong> {idea.hook}
              </p>
              <div className="flex flex-wrap gap-2">
                {idea.keywords && idea.keywords.map((keyword, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-full bg-cream-100 text-charcoal-700 text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Step 3: Generating
  if (step === 'generating') {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-12 text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-6 text-ocean-600 animate-spin" />
          <h2 className="text-2xl font-bold text-charcoal-900 mb-2">
            Creating Your Article
          </h2>
          <p className="text-charcoal-600 mb-6">
            AI is writing a 600-1000 word article and generating a featured image...
          </p>
          <p className="text-sm text-charcoal-500">
            This may take 30-60 seconds
          </p>
        </Card>
      </div>
    )
  }

  // Step 4: Review & Publish
  if (step === 'review' && editedPost) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => setStep('ideas')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Ideas
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handlePublish('draft')}
              disabled={loading}
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => handlePublish('published')}
              disabled={loading}
              className="bg-gradient-to-br from-ocean-500 to-ocean-600 hover:from-ocean-600 hover:to-ocean-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Publish Now
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Editor */}
          <div className="col-span-2 space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={editedPost.title}
                    onChange={(e) =>
                      setEditedPost({ ...editedPost, title: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Excerpt</Label>
                  <Textarea
                    value={editedPost.excerpt}
                    onChange={(e) =>
                      setEditedPost({ ...editedPost, excerpt: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Content</Label>
                  <Textarea
                    value={editedPost.content}
                    onChange={(e) =>
                      setEditedPost({ ...editedPost, content: e.target.value })
                    }
                    rows={20}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Preview & Meta */}
          <div className="space-y-6">
            {/* Featured Image */}
            <Card className="p-4">
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
                    alt={editedPost.title}
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

                  {/* Regenerate AI Image */}
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

                  {/* Upload from Computer */}
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

                  {/* Custom URL */}
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

            {/* Metadata */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">SEO & Metadata</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <Label className="text-xs">Meta Description</Label>
                  <p className="text-charcoal-600">{editedPost.metaDescription}</p>
                </div>
                <div>
                  <Label className="text-xs">Keywords</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {editedPost.keywords && editedPost.keywords.map((keyword: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-full bg-cream-100 text-charcoal-700 text-xs"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Read Time</Label>
                  <p className="text-charcoal-600">{editedPost.readTime} minutes</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return null
}
