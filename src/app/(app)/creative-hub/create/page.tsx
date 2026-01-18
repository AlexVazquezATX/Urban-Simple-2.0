'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Check,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  Link as LinkIcon,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  Copy,
  Hash,
  ChevronRight,
  SkipForward,
  Layers,
  SlidersHorizontal,
  ChevronDown,
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

interface InspirationData {
  topicId: string
  topicTitle: string
  topicSummary: string
  platform: string
  headline: string
  hook: string
  angle: string
  hashtags: string[]
  contentMode: string
}

const PLATFORMS = {
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'bg-blue-500' },
  instagram: { label: 'Instagram', icon: Instagram, color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  facebook: { label: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  twitter: { label: 'X', icon: Twitter, color: 'bg-sky-500' },
}

const IMAGE_STYLES = [
  { value: 'lifestyle', label: 'Lifestyle / Community' },
  { value: 'minimal', label: 'Minimal / Editorial' },
  { value: 'behindScenes', label: 'Behind the Scenes' },
  { value: 'quote', label: 'Quote / Typography' },
  { value: 'branded', label: 'Branded Promotional' },
]

// Content generation options
const TONE_OPTIONS = [
  { value: 'friendly', label: 'Friendly & Warm', description: 'Approachable, conversational' },
  { value: 'professional', label: 'Professional', description: 'Polished, business-focused' },
  { value: 'enthusiastic', label: 'Enthusiastic', description: 'Energetic, excited' },
  { value: 'storytelling', label: 'Storytelling', description: 'Narrative, engaging' },
]

const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short', description: '1-2 sentences' },
  { value: 'medium', label: 'Medium', description: '3-4 sentences' },
  { value: 'long', label: 'Long', description: '5-6 sentences' },
  { value: 'extended', label: 'Extended', description: 'Full paragraph+' },
]

const EMOJI_OPTIONS = [
  { value: 'none', label: 'None', description: 'No emojis' },
  { value: 'minimal', label: 'Minimal', description: '1-2 emojis' },
  { value: 'moderate', label: 'Moderate', description: '3-5 emojis' },
  { value: 'heavy', label: 'Heavy', description: 'Lots of emojis' },
]

const CTA_OPTIONS = [
  { value: 'none', label: 'No CTA', description: 'Just content' },
  { value: 'soft', label: 'Soft', description: 'Gentle suggestion' },
  { value: 'direct', label: 'Direct', description: 'Clear call to action' },
  { value: 'urgent', label: 'Urgent', description: 'Time-sensitive' },
]

type PlatformKey = keyof typeof PLATFORMS

export default function ContentStudioPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Content state
  const [platform, setPlatform] = useState<PlatformKey>('instagram')
  const [headline, setHeadline] = useState('')
  const [primaryText, setPrimaryText] = useState('')
  const [description, setDescription] = useState('')
  const [callToAction, setCta] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [hashtagInput, setHashtagInput] = useState('')

  // Topic context
  const [topicContext, setTopicContext] = useState<{ title: string; summary: string } | null>(null)
  const [topicId, setTopicId] = useState<string | null>(null)

  // Image state
  const [imageStyle, setImageStyle] = useState('lifestyle')
  const [generatedImage, setGeneratedImage] = useState<{
    imageBase64?: string
    imageUrl?: string
  } | null>(null)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [showImageOptions, setShowImageOptions] = useState(false)
  const [customImageUrl, setCustomImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  // Save state
  const [saving, setSaving] = useState(false)

  // Content generation state
  const [generatingContent, setGeneratingContent] = useState(false)
  const [showContentOptions, setShowContentOptions] = useState(false)
  const [contentTone, setContentTone] = useState('friendly')
  const [contentLength, setContentLength] = useState('medium')
  const [emojiUsage, setEmojiUsage] = useState('minimal')
  const [ctaStyle, setCtaStyle] = useState('soft')

  // Batch mode state
  const [batchQueue, setBatchQueue] = useState<InspirationData[]>([])
  const [batchIndex, setBatchIndex] = useState(0)
  const isBatchMode = batchQueue.length > 1

  // Load data from Daily Inspiration if available
  useEffect(() => {
    // Check for batch queue first
    const batchQueueStored = sessionStorage.getItem('createBatchQueue')
    const batchIndexStored = sessionStorage.getItem('createBatchIndex')

    if (batchQueueStored) {
      try {
        const queue: InspirationData[] = JSON.parse(batchQueueStored)
        const idx = batchIndexStored ? parseInt(batchIndexStored, 10) : 0
        setBatchQueue(queue)
        setBatchIndex(idx)

        // Load the current item from the queue
        if (queue[idx]) {
          loadTopicData(queue[idx])
        }

        // Don't clear batch queue yet - we'll clear when done
        sessionStorage.removeItem('createFromInspiration')
        return
      } catch (e) {
        console.error('Failed to parse batch queue:', e)
      }
    }

    // Single item mode
    const stored = sessionStorage.getItem('createFromInspiration')
    if (stored) {
      try {
        const data: InspirationData = JSON.parse(stored)
        loadTopicData(data)
        // Clear the storage so refreshing doesn't reload old data
        sessionStorage.removeItem('createFromInspiration')
      } catch (e) {
        console.error('Failed to parse inspiration data:', e)
      }
    }
  }, [])

  // Generate content ideas from API
  const generateContentIdeas = useCallback(async (
    topicIdToGenerate: string,
    platformToUse: string,
    contentMode: string,
    forceRegenerate = false,
    options?: {
      tone?: string
      length?: string
      emoji?: string
      cta?: string
    }
  ) => {
    setGeneratingContent(true)
    try {
      const response = await fetch(`/api/creative-hub/inspiration/topics/${topicIdToGenerate}/quick-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platformToUse,
          contentMode: contentMode || 'community',
          regenerate: forceRegenerate,
          // Content customization options
          tone: options?.tone || contentTone,
          length: options?.length || contentLength,
          emoji: options?.emoji || emojiUsage,
          cta: options?.cta || ctaStyle,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate content ideas')
      }

      const data = await response.json()
      if (data.ideas && data.ideas.length > 0) {
        // Find the idea for the selected platform, or use the first one
        const platformIdea = data.ideas.find((idea: { platform: string }) => idea.platform === platformToUse) || data.ideas[0]

        setHeadline(platformIdea.headline || '')
        setPrimaryText(platformIdea.hook || '')
        setHashtags(platformIdea.hashtags || [])
      }
    } catch (error) {
      console.error('Failed to generate content ideas:', error)
    } finally {
      setGeneratingContent(false)
    }
  }, [contentTone, contentLength, emojiUsage, ctaStyle])

  function loadTopicData(data: InspirationData) {
    const platformToUse = (data.platform as PlatformKey) || 'instagram'
    setPlatform(platformToUse)
    setHeadline(data.headline || '')
    setPrimaryText(data.hook || '')
    setHashtags(data.hashtags || [])
    setTopicId(data.topicId)
    setTopicContext({
      title: data.topicTitle,
      summary: data.topicSummary,
    })
    // Reset image state for new topic
    setGeneratedImage(null)
    setShowImageOptions(false)
    setCustomImageUrl('')

    // If content fields are empty, auto-generate content ideas
    // Use forceRegenerate=true to ensure we get fresh ideas even if topic has cached empty/partial ideas
    const needsContentGeneration = !data.headline && !data.hook && (!data.hashtags || data.hashtags.length === 0)
    if (needsContentGeneration && data.topicId) {
      generateContentIdeas(data.topicId, platformToUse, data.contentMode, true)
    }
  }

  const handleGenerateImage = useCallback(async () => {
    setGeneratingImage(true)
    try {
      const aspectRatio = platform === 'instagram' ? '1:1' : '16:9'

      const response = await fetch('/api/creative-hub/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          imageType: 'service_showcase',
          aspectRatio,
          customPrompt: topicContext?.title || headline,
          imageStyle,
          platform,
          topic: topicContext?.title || headline,
        }),
      })

      const data = await response.json()
      if (data.image) {
        setGeneratedImage(data.image)
      }
    } catch (error) {
      console.error('Failed to generate image:', error)
    } finally {
      setGeneratingImage(false)
    }
  }, [platform, topicContext, headline, imageStyle])

  // Generate image automatically when topic loads
  useEffect(() => {
    if (topicContext && !generatedImage && !generatingImage) {
      handleGenerateImage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicContext])

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'creative')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      setGeneratedImage({ imageUrl: data.url })
      setShowImageOptions(false)
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  function handleSetCustomUrl() {
    if (customImageUrl.trim()) {
      setGeneratedImage({ imageUrl: customImageUrl.trim() })
      setCustomImageUrl('')
      setShowImageOptions(false)
    }
  }

  function handleAddHashtag() {
    const tag = hashtagInput.trim().replace(/^#/, '')
    if (tag && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag])
      setHashtagInput('')
    }
  }

  function handleRemoveHashtag(tag: string) {
    setHashtags(hashtags.filter((h) => h !== tag))
  }

  function handleCopyContent() {
    const text = `${headline ? headline + '\n\n' : ''}${primaryText}\n\n${hashtags.map((h) => '#' + h).join(' ')}`
    navigator.clipboard.writeText(text)
    alert('Content copied to clipboard!')
  }

  async function handleSave(status: 'draft' | 'approved') {
    if (!primaryText.trim()) {
      alert('Please add some content text')
      return
    }

    setSaving(true)
    try {
      // Create a project
      const projectResponse = await fetch('/api/creative-hub/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${PLATFORMS[platform].label} Content - ${new Date().toLocaleDateString()}`,
          campaignGoal: 'awareness',
        }),
      })

      const project = await projectResponse.json()

      // Save the image first if we have one
      let imageId: string | undefined
      if (generatedImage && (generatedImage.imageBase64 || generatedImage.imageUrl)) {
        const imageResponse = await fetch('/api/creative-hub/images/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save',
            projectId: project.id,
            name: `${PLATFORMS[platform].label} - ${headline || 'Generated Image'}`,
            imageBase64: generatedImage.imageBase64,
            imageUrl: generatedImage.imageUrl,
            imageType: imageStyle === 'branded' ? 'promotional' : 'service_showcase',
            aspectRatio: platform === 'instagram' ? '1:1' : '16:9',
          }),
        })

        if (imageResponse.ok) {
          const savedImage = await imageResponse.json()
          imageId = savedImage.id
        }
      }

      // Save content
      await fetch('/api/creative-hub/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          contentType: 'social_post',
          platform,
          headline,
          primaryText,
          description,
          callToAction,
          hashtags,
          imageId,
          isAiGenerated: true,
          aiModel: 'gemini-2.0-flash-exp',
          aiGenerationData: {
            topicId,
            topicContext,
            imageStyle,
          },
          status,
        }),
      })

      // Mark topic as used if we have one
      if (topicId) {
        await fetch(`/api/creative-hub/inspiration/topics/${topicId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'use' }),
        }).catch(() => {}) // Ignore errors
      }

      // Handle batch mode - move to next topic or finish
      if (isBatchMode && batchIndex < batchQueue.length - 1) {
        moveToNextTopic()
      } else {
        // Clear batch queue and go to gallery
        sessionStorage.removeItem('createBatchQueue')
        sessionStorage.removeItem('createBatchIndex')
        router.push('/creative-hub/gallery')
      }
    } catch (error) {
      console.error('Failed to save content:', error)
      alert('Failed to save content. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function moveToNextTopic() {
    const nextIndex = batchIndex + 1
    if (nextIndex < batchQueue.length) {
      setBatchIndex(nextIndex)
      sessionStorage.setItem('createBatchIndex', nextIndex.toString())
      loadTopicData(batchQueue[nextIndex])
    }
  }

  function handleSkipTopic() {
    if (isBatchMode && batchIndex < batchQueue.length - 1) {
      moveToNextTopic()
    } else {
      // Last topic or single mode - just go to gallery
      sessionStorage.removeItem('createBatchQueue')
      sessionStorage.removeItem('createBatchIndex')
      router.push('/creative-hub/gallery')
    }
  }

  function handleExitBatch() {
    sessionStorage.removeItem('createBatchQueue')
    sessionStorage.removeItem('createBatchIndex')
    router.push('/creative-hub/inspiration')
  }

  const PlatformIcon = PLATFORMS[platform].icon
  const imageSrc = generatedImage?.imageUrl ||
    (generatedImage?.imageBase64 ? `data:image/png;base64,${generatedImage.imageBase64}` : undefined)

  return (
    <div className="min-h-screen bg-charcoal-50">
      {/* Batch Progress Bar */}
      {isBatchMode && (
        <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 px-6 py-2">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3 text-white">
              <Layers className="w-4 h-4" />
              <span className="text-sm font-medium">
                Topic {batchIndex + 1} of {batchQueue.length}
              </span>
              <div className="flex gap-1 ml-2">
                {batchQueue.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx < batchIndex
                        ? 'bg-white'
                        : idx === batchIndex
                        ? 'bg-white ring-2 ring-white/50'
                        : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSkipTopic}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="w-4 h-4 mr-1" />
                Skip
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleExitBatch}
                className="text-white/70 hover:text-white hover:bg-white/20"
              >
                Exit Batch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-charcoal-100 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button variant="ghost" onClick={isBatchMode ? handleExitBatch : () => router.push('/creative-hub/inspiration')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isBatchMode ? 'Exit Batch' : 'Back to Inspiration'}
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleCopyContent} disabled={generatingContent}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving || generatingContent}>
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSave('approved')}
              disabled={saving || generatingContent}
              className="bg-ocean-600 hover:bg-ocean-700 text-white"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : isBatchMode && batchIndex < batchQueue.length - 1 ? (
                <ChevronRight className="w-4 h-4 mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {isBatchMode && batchIndex < batchQueue.length - 1 ? 'Save & Next' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>

      {/* Topic Context Banner */}
      {topicContext && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-6 py-3">
          <div className="flex items-center gap-2 max-w-7xl mx-auto text-sm">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-amber-700">Creating from:</span>
            <span className="text-charcoal-700">{topicContext.title}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Editor */}
          <div className="space-y-6">
            {/* Platform Selector */}
            <Card className="p-5">
              <Label className="text-sm font-semibold mb-3 block">Platform</Label>
              <div className="flex gap-2">
                {(Object.keys(PLATFORMS) as PlatformKey[]).map((p) => {
                  const config = PLATFORMS[p]
                  const Icon = config.icon
                  const isActive = platform === p

                  return (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? `${config.color} text-white`
                          : 'bg-charcoal-100 text-charcoal-600 hover:bg-charcoal-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {config.label}
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* Content Fields */}
            <Card className="p-5 space-y-5 relative">
              {generatingContent && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg">
                  <Loader2 className="w-8 h-8 text-ocean-500 animate-spin mb-3" />
                  <p className="text-sm font-medium text-charcoal-600">Generating content ideas...</p>
                </div>
              )}
              {/* Content Generation Options */}
              {topicId && !generatingContent && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowContentOptions(!showContentOptions)}
                      className="text-charcoal-600 hover:text-charcoal-800 -ml-2"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                      Content Options
                      <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${showContentOptions ? 'rotate-180' : ''}`} />
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => generateContentIdeas(topicId, platform, batchQueue[batchIndex]?.contentMode || 'community', true)}
                      className="bg-ocean-600 hover:bg-ocean-700"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Generate Content
                    </Button>
                  </div>

                  {/* Expanded Options Panel */}
                  {showContentOptions && (
                    <div className="p-4 bg-charcoal-50 rounded-lg border border-charcoal-200 space-y-4">
                      {/* Tone */}
                      <div>
                        <Label className="text-xs font-medium text-charcoal-600 mb-2 block">Tone</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {TONE_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setContentTone(option.value)}
                              className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                                contentTone === option.value
                                  ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                                  : 'border-charcoal-200 bg-white hover:border-charcoal-300'
                              }`}
                            >
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-charcoal-500">{option.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Length */}
                      <div>
                        <Label className="text-xs font-medium text-charcoal-600 mb-2 block">Length</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {LENGTH_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setContentLength(option.value)}
                              className={`text-center px-2 py-2 rounded-lg border text-sm transition-all ${
                                contentLength === option.value
                                  ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                                  : 'border-charcoal-200 bg-white hover:border-charcoal-300'
                              }`}
                            >
                              <div className="font-medium text-xs">{option.label}</div>
                              <div className="text-[10px] text-charcoal-500">{option.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Emoji & CTA Row */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Emoji Usage */}
                        <div>
                          <Label className="text-xs font-medium text-charcoal-600 mb-2 block">Emojis</Label>
                          <div className="grid grid-cols-2 gap-1">
                            {EMOJI_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => setEmojiUsage(option.value)}
                                className={`px-2 py-1.5 rounded border text-xs transition-all ${
                                  emojiUsage === option.value
                                    ? 'border-ocean-500 bg-ocean-50 text-ocean-700 font-medium'
                                    : 'border-charcoal-200 bg-white hover:border-charcoal-300'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* CTA Style */}
                        <div>
                          <Label className="text-xs font-medium text-charcoal-600 mb-2 block">Call to Action</Label>
                          <div className="grid grid-cols-2 gap-1">
                            {CTA_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => setCtaStyle(option.value)}
                                className={`px-2 py-1.5 rounded border text-xs transition-all ${
                                  ctaStyle === option.value
                                    ? 'border-ocean-500 bg-ocean-50 text-ocean-700 font-medium'
                                    : 'border-charcoal-200 bg-white hover:border-charcoal-300'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div>
                <Label>Headline</Label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Catchy headline..."
                  className="mt-2"
                  disabled={generatingContent}
                />
              </div>

              <div>
                <Label>Caption / Primary Text</Label>
                <Textarea
                  value={primaryText}
                  onChange={(e) => setPrimaryText(e.target.value)}
                  placeholder="Write your post content..."
                  rows={6}
                  className="mt-2"
                  disabled={generatingContent}
                />
              </div>

              <div>
                <Label>Description (optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional context..."
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Call to Action (optional)</Label>
                <Input
                  value={callToAction}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder="What should people do?"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Hashtags</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHashtag())}
                    placeholder="Add hashtag..."
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={handleAddHashtag}>
                    Add
                  </Button>
                </div>
                {hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {hashtags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-red-50 hover:border-red-200"
                        onClick={() => handleRemoveHashtag(tag)}
                      >
                        <Hash className="w-3 h-3 mr-0.5" />
                        {tag}
                        <span className="ml-1 text-charcoal-400">×</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Image Section */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label className="text-sm font-semibold">Image</Label>
                  <p className="text-xs text-charcoal-500 mt-0.5">AI-generated or upload your own</p>
                </div>
                <Select value={imageStyle} onValueChange={setImageStyle}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Style" />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_STYLES.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Image Preview */}
              <div className="relative rounded-xl overflow-hidden bg-charcoal-100 aspect-square mb-4">
                {generatingImage ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 text-ocean-500 animate-spin mb-3" />
                    <p className="text-sm text-charcoal-600">Generating image...</p>
                  </div>
                ) : imageSrc ? (
                  <img src={imageSrc} alt="Content" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-charcoal-300 mb-2" />
                    <p className="text-sm text-charcoal-400">No image yet</p>
                  </div>
                )}
              </div>

              {/* Image Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleGenerateImage}
                  disabled={generatingImage}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${generatingImage ? 'animate-spin' : ''}`} />
                  Generate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowImageOptions(!showImageOptions)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>

              {/* Upload Options */}
              {showImageOptions && (
                <div className="mt-4 p-4 bg-charcoal-50 rounded-lg border border-charcoal-200 space-y-3">
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
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Choose from Computer
                  </Button>

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

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setShowImageOptions(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT: Live Preview */}
          <div className="lg:sticky lg:top-6 space-y-6">
            <Card className="p-5">
              <Label className="text-sm font-semibold mb-4 block">Live Preview</Label>

              {/* Platform Preview Frame */}
              <div className="bg-white border border-charcoal-200 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-charcoal-100">
                  <div className={`w-10 h-10 rounded-full ${PLATFORMS[platform].color} flex items-center justify-center`}>
                    <PlatformIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Urban Simple</p>
                    <p className="text-xs text-charcoal-400">Just now</p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  {headline && (
                    <h3 className="font-semibold text-charcoal-900 mb-2">{headline}</h3>
                  )}
                  {primaryText ? (
                    <p className="text-sm text-charcoal-700 whitespace-pre-wrap mb-3">
                      {primaryText}
                    </p>
                  ) : (
                    <p className="text-sm text-charcoal-400 italic mb-3">
                      Your content will appear here...
                    </p>
                  )}
                  {hashtags.length > 0 && (
                    <p className="text-sm text-ocean-600">
                      {hashtags.map((h) => '#' + h).join(' ')}
                    </p>
                  )}
                </div>

                {/* Image */}
                {imageSrc && (
                  <div className="px-4 pb-4">
                    <img
                      src={imageSrc}
                      alt="Preview"
                      className="w-full rounded-lg"
                    />
                  </div>
                )}

                {/* Engagement Bar */}
                <div className="px-4 py-3 border-t border-charcoal-100 flex items-center gap-6 text-charcoal-400 text-sm">
                  <span>❤️ Like</span>
                  <span>💬 Comment</span>
                  <span>↗️ Share</span>
                </div>
              </div>
            </Card>

            {/* Quick Tips */}
            <Card className="p-5 bg-gradient-to-br from-ocean-50 to-ocean-100 border-ocean-200">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-ocean-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-ocean-900 text-sm mb-1">Quick Tips</h4>
                  <ul className="text-xs text-ocean-700 space-y-1">
                    <li>• Keep headlines under 60 characters</li>
                    <li>• Use 3-5 relevant hashtags</li>
                    <li>• Include a clear call-to-action</li>
                    <li>• Authentic photos outperform AI images</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
