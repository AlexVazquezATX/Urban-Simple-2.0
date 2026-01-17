'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  TrendingUp,
  Copy,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

type Step = 'params' | 'ideas' | 'generating' | 'review'

interface ContentIdea {
  headline: string
  hook: string
  keyPoints: string[]
  suggestedImage: string
  hashtags: string[]
}

interface GeneratedContent {
  headline: string
  primaryText: string
  description?: string
  callToAction: string
  hashtags: string[]
}

const PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'bg-blue-500' },
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  { value: 'facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { value: 'twitter', label: 'Twitter/X', icon: Twitter, color: 'bg-sky-500' },
  { value: 'meta_ad', label: 'Meta Ad', icon: TrendingUp, color: 'bg-blue-500' },
  { value: 'google_display', label: 'Google Display', icon: TrendingUp, color: 'bg-green-500' },
  { value: 'linkedin_ad', label: 'LinkedIn Ad', icon: Linkedin, color: 'bg-blue-700' },
]

const SERVICE_HIGHLIGHTS = [
  { value: 'kitchen_cleaning', label: 'Kitchen Cleaning' },
  { value: 'restaurant_deep_clean', label: 'Restaurant Deep Clean' },
  { value: 'hotel_housekeeping', label: 'Hotel Housekeeping' },
  { value: 'office_cleaning', label: 'Office Cleaning' },
  { value: 'post_construction', label: 'Post-Construction' },
  { value: 'floor_care', label: 'Floor Care' },
  { value: 'general', label: 'General Services' },
]

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'casual', label: 'Casual' },
  { value: 'funny', label: 'Funny / Quirky' },
]

const IMAGE_STYLES = [
  { value: 'lifestyle', label: 'Lifestyle / Community', description: 'Authentic Austin scenes, local restaurants, real moments' },
  { value: 'minimal', label: 'Minimal / Editorial', description: 'Clean, magazine-quality, sophisticated' },
  { value: 'behindScenes', label: 'Behind the Scenes', description: 'Real work moments, team culture, authentic action' },
  { value: 'quote', label: 'Quote / Typography', description: 'Text-focused, inspirational, clean backgrounds' },
  { value: 'data', label: 'Stats / Infographic', description: 'Data visualization, facts, educational' },
  { value: 'branded', label: 'Branded Promotional', description: 'When you actually want an ad with logo and CTA' },
  { value: 'artistic', label: 'Artistic / Abstract', description: 'Creative, eye-catching, pattern-based' },
  { value: 'seasonal', label: 'Seasonal / Holiday', description: 'Themed for specific holidays or seasons' },
]

export default function CreateContentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('params')
  const [loading, setLoading] = useState(false)
  const [fromInspiration, setFromInspiration] = useState(false)

  // Step 1: Parameters
  const [params, setParams] = useState({
    contentType: 'social_post',
    platform: '',
    serviceHighlight: 'general',
    tone: 'professional',
    targetAudience: 'Restaurant owners and managers in Austin, TX',
    topic: '',
    callToAction: 'Get a free quote today',
    topicId: '', // For tracking which inspiration topic this came from
    imageStyle: 'lifestyle', // Default to lifestyle for authentic, non-ad feel
  })

  // Check for query params from Daily Inspiration
  useEffect(() => {
    const topicId = searchParams.get('topicId')
    const platform = searchParams.get('platform')
    const headline = searchParams.get('headline')
    const hook = searchParams.get('hook')

    if (topicId || platform || headline) {
      setFromInspiration(true)
      setParams((prev) => ({
        ...prev,
        platform: platform || prev.platform,
        topic: headline || hook || prev.topic,
        topicId: topicId || '',
      }))

      // If we have enough info, we can pre-populate an idea
      if (headline && hook) {
        setIdeas([
          {
            headline: headline,
            hook: hook,
            keyPoints: ['Pre-loaded from Daily Inspiration'],
            suggestedImage: 'professional commercial setting',
            hashtags: [],
          },
        ])
      }
    }
  }, [searchParams])

  // Step 2: Ideas
  const [ideas, setIdeas] = useState<ContentIdea[]>([])
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null)

  // Step 3: Generated Content
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [generatedImage, setGeneratedImage] = useState<{
    imageBase64?: string
    imageUrl?: string
    isFallback?: boolean
  } | null>(null)

  // Step 4: Editable content
  const [editedContent, setEditedContent] = useState<GeneratedContent | null>(null)

  // Image management
  const [showImageOptions, setShowImageOptions] = useState(false)
  const [customImageUrl, setCustomImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleGenerateIdeas() {
    if (!params.platform) {
      alert('Please select a platform')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/creative-hub/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ideas',
          ...params,
        }),
      })

      const data = await response.json()
      if (data.ideas) {
        setIdeas(data.ideas)
        setStep('ideas')
      } else {
        throw new Error('No ideas returned')
      }
    } catch (error) {
      console.error('Failed to generate ideas:', error)
      alert('Failed to generate ideas. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectIdea(idea: ContentIdea) {
    setSelectedIdea(idea)
    setStep('generating')
    setLoading(true)

    try {
      const response = await fetch('/api/creative-hub/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'content',
          ...params,
          selectedIdea: idea,
          generateImage: true,
          imageType: 'promotional',
          imageStyle: params.imageStyle,
        }),
      })

      const data = await response.json()

      if (data.content) {
        setGeneratedContent(data.content)
        setEditedContent(data.content)
      }

      if (data.image) {
        setGeneratedImage(data.image)
      }

      setStep('review')
    } catch (error) {
      console.error('Failed to generate content:', error)
      alert('Failed to generate content. Please try again.')
      setStep('ideas')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerateImage() {
    setUploadingImage(true)
    try {
      // Force square for Instagram, otherwise use platform default
      const aspectRatio = params.platform === 'instagram' ? '1:1' :
        (params.platform === 'linkedin' || params.platform === 'facebook') ? '16:9' : '1:1'

      const response = await fetch('/api/creative-hub/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          imageType: 'promotional',
          aspectRatio,
          serviceContext: params.serviceHighlight,
          customPrompt: selectedIdea?.suggestedImage,
          imageStyle: params.imageStyle,
          platform: params.platform,
          topic: params.topic,
        }),
      })

      const data = await response.json()
      if (data.image) {
        setGeneratedImage(data.image)
      }
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

  function handleCopyContent() {
    if (!editedContent) return
    const text = `${editedContent.headline ? editedContent.headline + '\n\n' : ''}${editedContent.primaryText}\n\n${editedContent.hashtags.map(h => '#' + h).join(' ')}`
    navigator.clipboard.writeText(text)
    alert('Content copied to clipboard!')
  }

  async function handleSave(status: 'draft' | 'approved') {
    if (!editedContent) return

    setLoading(true)
    try {
      // First create a project if needed (simplified - in production you'd select/create project)
      const projectResponse = await fetch('/api/creative-hub/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${params.platform} Content - ${new Date().toLocaleDateString()}`,
          campaignGoal: 'awareness',
          targetAudience: params.targetAudience,
          defaultTone: params.tone,
        }),
      })

      const project = await projectResponse.json()

      // Save content
      await fetch('/api/creative-hub/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          contentType: params.contentType,
          platform: params.platform,
          headline: editedContent.headline,
          primaryText: editedContent.primaryText,
          description: editedContent.description,
          callToAction: editedContent.callToAction,
          hashtags: editedContent.hashtags,
          isAiGenerated: true,
          aiModel: 'gemini-2.0-flash-exp',
          aiGenerationData: {
            params,
            selectedIdea,
          },
          status,
        }),
      })

      router.push('/creative-hub/gallery')
    } catch (error) {
      console.error('Failed to save content:', error)
      alert('Failed to save content. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 1: Parameters
  if (step === 'params') {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => router.push(fromInspiration ? '/creative-hub/inspiration' : '/creative-hub')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {fromInspiration ? 'Back to Daily Inspiration' : 'Back to Creative Hub'}
        </Button>

        {fromInspiration && params.topic && (
          <div className="mb-4 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 text-amber-700 text-sm">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">Creating from Daily Inspiration:</span>
              <span className="text-charcoal-700">{params.topic}</span>
            </div>
          </div>
        )}

        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-ocean-100 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-ocean-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-charcoal-900">Create Marketing Content</h2>
              <p className="text-charcoal-600">Generate social posts & ads with AI</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Content Type */}
            <div>
              <Label>Content Type</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  type="button"
                  variant={params.contentType === 'social_post' ? 'default' : 'outline'}
                  onClick={() => setParams({ ...params, contentType: 'social_post' })}
                  className={params.contentType === 'social_post' ? 'bg-ocean-600' : ''}
                >
                  Social Post
                </Button>
                <Button
                  type="button"
                  variant={params.contentType === 'ad_creative' ? 'default' : 'outline'}
                  onClick={() => setParams({ ...params, contentType: 'ad_creative' })}
                  className={params.contentType === 'ad_creative' ? 'bg-ocean-600' : ''}
                >
                  Ad Creative
                </Button>
              </div>
            </div>

            {/* Platform */}
            <div>
              <Label>Platform</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {PLATFORMS.filter(p =>
                  params.contentType === 'social_post'
                    ? ['linkedin', 'instagram', 'facebook', 'twitter'].includes(p.value)
                    : ['meta_ad', 'google_display', 'linkedin_ad'].includes(p.value)
                ).map((platform) => {
                  const Icon = platform.icon
                  const isSelected = params.platform === platform.value
                  return (
                    <button
                      key={platform.value}
                      type="button"
                      onClick={() => setParams({ ...params, platform: platform.value })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-ocean-500 bg-ocean-50'
                          : 'border-cream-200 hover:border-cream-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center text-white mx-auto mb-2`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium">{platform.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Service Highlight */}
            <div>
              <Label>Service to Highlight</Label>
              <Select
                value={params.serviceHighlight}
                onValueChange={(value) => setParams({ ...params, serviceHighlight: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_HIGHLIGHTS.map((service) => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tone */}
            <div>
              <Label>Tone</Label>
              <Select
                value={params.tone}
                onValueChange={(value) => setParams({ ...params, tone: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((tone) => (
                    <SelectItem key={tone.value} value={tone.value}>
                      {tone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Image Style */}
            <div>
              <Label>Image Style</Label>
              <p className="text-xs text-charcoal-500 mb-2">Choose how you want the generated image to look</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {IMAGE_STYLES.map((style) => {
                  const isSelected = params.imageStyle === style.value
                  return (
                    <button
                      key={style.value}
                      type="button"
                      onClick={() => setParams({ ...params, imageStyle: style.value })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-ocean-500 bg-ocean-50'
                          : 'border-cream-200 hover:border-cream-300'
                      }`}
                    >
                      <span className="text-sm font-medium block">{style.label}</span>
                      <span className="text-xs text-charcoal-500">{style.description}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <Label>Target Audience</Label>
              <Input
                value={params.targetAudience}
                onChange={(e) => setParams({ ...params, targetAudience: e.target.value })}
                placeholder="e.g., Restaurant owners in Austin, TX"
                className="mt-2"
              />
            </div>

            {/* Topic (Optional) */}
            <div>
              <Label>Specific Topic (Optional)</Label>
              <Input
                value={params.topic}
                onChange={(e) => setParams({ ...params, topic: e.target.value })}
                placeholder="e.g., Health inspection season, Spring cleaning"
                className="mt-2"
              />
            </div>

            {/* Call to Action */}
            <div>
              <Label>Call to Action</Label>
              <Input
                value={params.callToAction}
                onChange={(e) => setParams({ ...params, callToAction: e.target.value })}
                placeholder="e.g., Get a free quote today"
                className="mt-2"
              />
            </div>

            <Button
              onClick={handleGenerateIdeas}
              disabled={loading || !params.platform}
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
                  Generate Content Ideas
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

        <h2 className="text-2xl font-bold text-charcoal-900 mb-6">Select a Content Idea</h2>

        <div className="grid gap-4">
          {ideas.map((idea, index) => (
            <Card
              key={index}
              className="p-6 cursor-pointer hover:border-ocean-500 hover:shadow-md transition-all"
              onClick={() => handleSelectIdea(idea)}
            >
              <h3 className="text-xl font-semibold text-charcoal-900 mb-2">
                {idea.headline}
              </h3>
              <p className="text-charcoal-600 mb-3 italic">"{idea.hook}"</p>
              <div className="space-y-2 mb-4">
                {idea.keyPoints.map((point, i) => (
                  <p key={i} className="text-sm text-charcoal-600">• {point}</p>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {idea.hashtags.slice(0, 5).map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
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
          <h2 className="text-2xl font-bold text-charcoal-900 mb-2">Creating Your Content</h2>
          <p className="text-charcoal-600 mb-6">
            AI is writing your {params.platform} {params.contentType === 'social_post' ? 'post' : 'ad'} and generating an image...
          </p>
          <p className="text-sm text-charcoal-500">This may take 30-60 seconds</p>
        </Card>
      </div>
    )
  }

  // Step 4: Review & Edit
  if (step === 'review' && editedContent) {
    const platformConfig = PLATFORMS.find(p => p.value === params.platform)
    const PlatformIcon = platformConfig?.icon || Sparkles

    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => setStep('ideas')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Ideas
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCopyContent}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" onClick={() => handleSave('draft')} disabled={loading}>
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSave('approved')}
              disabled={loading}
              className="bg-gradient-to-br from-ocean-500 to-ocean-600 hover:from-ocean-600 hover:to-ocean-700"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Check className="w-5 h-5 mr-2" />
              )}
              Approve & Save
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Editor */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg ${platformConfig?.color} flex items-center justify-center text-white`}>
                  <PlatformIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{platformConfig?.label} Content</h3>
                  <p className="text-sm text-charcoal-500">{params.contentType === 'social_post' ? 'Organic Post' : 'Paid Ad'}</p>
                </div>
              </div>

              <div className="space-y-4">
                {editedContent.headline && (
                  <div>
                    <Label>Headline</Label>
                    <Input
                      value={editedContent.headline}
                      onChange={(e) => setEditedContent({ ...editedContent, headline: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                )}

                <div>
                  <Label>Primary Text</Label>
                  <Textarea
                    value={editedContent.primaryText}
                    onChange={(e) => setEditedContent({ ...editedContent, primaryText: e.target.value })}
                    rows={8}
                    className="mt-2"
                  />
                </div>

                {editedContent.description && (
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={editedContent.description}
                      onChange={(e) => setEditedContent({ ...editedContent, description: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                )}

                <div>
                  <Label>Call to Action</Label>
                  <Input
                    value={editedContent.callToAction}
                    onChange={(e) => setEditedContent({ ...editedContent, callToAction: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Hashtags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editedContent.hashtags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="cursor-pointer hover:bg-red-50">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Image & Preview */}
          <div className="space-y-6">
            {/* Image Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-lg font-semibold">Image</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImageOptions(!showImageOptions)}
                >
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Change
                </Button>
              </div>

              {generatedImage ? (
                <div className="relative group">
                  <img
                    src={
                      generatedImage.imageUrl ||
                      (generatedImage.imageBase64
                        ? `data:image/png;base64,${generatedImage.imageBase64}`
                        : undefined)
                    }
                    alt="Generated content"
                    className="w-full rounded-lg"
                  />
                  {generatedImage.isFallback && (
                    <Badge className="absolute top-2 right-2 bg-bronze-500">
                      Stock Image
                    </Badge>
                  )}
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-square bg-cream-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-charcoal-400">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                    <p>No image generated</p>
                  </div>
                </div>
              )}

              {/* Image Options */}
              {showImageOptions && (
                <div className="mt-4 p-4 bg-cream-50 rounded-lg border border-cream-200 space-y-4">
                  <h4 className="text-sm font-semibold">Change Image</h4>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleRegenerateImage}
                    disabled={uploadingImage}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${uploadingImage ? 'animate-spin' : ''}`} />
                    Generate New AI Image
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

            {/* Preview */}
            <Card className="p-6">
              <Label className="text-lg font-semibold mb-4 block">Preview</Label>
              <div className="bg-white border border-cream-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-ocean-500"></div>
                  <div>
                    <p className="font-semibold text-sm">Urban Simple</p>
                    <p className="text-xs text-charcoal-400">Just now</p>
                  </div>
                </div>
                {editedContent.headline && (
                  <h4 className="font-semibold mb-2">{editedContent.headline}</h4>
                )}
                <p className="text-sm whitespace-pre-wrap mb-3">{editedContent.primaryText}</p>
                {editedContent.hashtags.length > 0 && (
                  <p className="text-sm text-ocean-600">
                    {editedContent.hashtags.map(h => '#' + h).join(' ')}
                  </p>
                )}
                {generatedImage && (
                  <img
                    src={
                      generatedImage.imageUrl ||
                      (generatedImage.imageBase64
                        ? `data:image/png;base64,${generatedImage.imageBase64}`
                        : undefined)
                    }
                    alt=""
                    className="w-full rounded-lg mt-3"
                  />
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return null
}
