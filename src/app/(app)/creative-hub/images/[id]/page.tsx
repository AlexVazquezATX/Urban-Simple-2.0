'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Download,
  Trash2,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Maximize2,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ImageLightbox } from '@/components/content-studio'
import { toast } from 'sonner'

type Platform = 'instagram' | 'facebook' | 'twitter'

interface CreativeImage {
  id: string
  name: string
  imageUrl?: string
  imageBase64?: string
  imageType: string
  aspectRatio: string
  isAiGenerated: boolean
  aiPrompt?: string
  aiModel?: string
  tags: string[]
  category?: string
  photoCredit?: string
  description?: string
  campaign?: string
  captionInstagram?: string
  captionFacebook?: string
  captionTwitter?: string
  hashtags: string[]
  status: string
  queueStatus: string
  priorityRank?: number | null
  createdAt: string
}

export default function CreativeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [image, setImage] = useState<CreativeImage | null>(null)
  const [allImages, setAllImages] = useState<CreativeImage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Editable fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [campaign, setCampaign] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [status, setStatus] = useState('draft')
  const [queueStatus, setQueueStatus] = useState('pending')
  const [priorityRank, setPriorityRank] = useState('')

  // Captions
  const [activePlatform, setActivePlatform] = useState<Platform>('instagram')
  const [captionInstagram, setCaptionInstagram] = useState('')
  const [captionFacebook, setCaptionFacebook] = useState('')
  const [captionTwitter, setCaptionTwitter] = useState('')
  const [hashtagInput, setHashtagInput] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadImage()
    loadAllImages()
  }, [id])

  async function loadImage() {
    try {
      setLoading(true)
      const res = await fetch(`/api/creative-hub/images/${id}`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      setImage(data)

      // Populate form
      setName(data.name || '')
      setDescription(data.description || '')
      setCampaign(data.campaign || '')
      setTagsInput((data.tags || []).join(', '))
      setStatus(data.status || 'draft')
      setQueueStatus(data.queueStatus || 'pending')
      setPriorityRank(data.priorityRank != null ? String(data.priorityRank) : '')
      setCaptionInstagram(data.captionInstagram || '')
      setCaptionFacebook(data.captionFacebook || '')
      setCaptionTwitter(data.captionTwitter || '')
      setHashtags(data.hashtags || [])
    } catch {
      toast.error('Failed to load creative')
      router.push('/creative-hub/images')
    } finally {
      setLoading(false)
    }
  }

  async function loadAllImages() {
    try {
      const res = await fetch('/api/creative-hub/images')
      const data = await res.json()
      const imgs = data.images || []
      setAllImages(imgs)
      // Find current image index in gallery
      const idx = imgs.findIndex((img: CreativeImage) => img.id === id)
      if (idx >= 0) setLightboxIndex(idx)
    } catch {
      // Silently fail — lightbox will just show current image
    }
  }

  function getGalleryImageSrc(img: CreativeImage): string {
    if (img.imageUrl) return img.imageUrl
    return `/api/creative-hub/images/${img.id}/image`
  }

  function getImageSrc(): string {
    if (!image) return ''
    if (image.imageUrl) return image.imageUrl
    if (image.imageBase64) return `data:image/png;base64,${image.imageBase64}`
    return `/api/creative-hub/images/${image.id}/image`
  }

  function getActiveCaption(): string {
    if (activePlatform === 'instagram') return captionInstagram
    if (activePlatform === 'facebook') return captionFacebook
    return captionTwitter
  }

  function setActiveCaption(value: string) {
    if (activePlatform === 'instagram') setCaptionInstagram(value)
    else if (activePlatform === 'facebook') setCaptionFacebook(value)
    else setCaptionTwitter(value)
  }

  async function handleSave() {
    try {
      setSaving(true)
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const res = await fetch(`/api/creative-hub/images/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          campaign: campaign || null,
          tags,
          status,
          queueStatus,
          priorityRank: priorityRank ? parseInt(priorityRank) : null,
          captionInstagram: captionInstagram || null,
          captionFacebook: captionFacebook || null,
          captionTwitter: captionTwitter || null,
          hashtags,
        }),
      })

      if (!res.ok) throw new Error('Save failed')
      toast.success('Changes saved')
    } catch {
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this creative?')) return

    try {
      await fetch(`/api/creative-hub/images/${id}`, { method: 'DELETE' })
      toast.success('Creative deleted')
      router.push('/creative-hub/images')
    } catch {
      toast.error('Failed to delete')
    }
  }

  async function handleGenerateCaption() {
    try {
      setGeneratingCaption(true)
      const res = await fetch(`/api/creative-hub/images/${id}/caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: activePlatform }),
      })

      if (!res.ok) throw new Error('Caption generation failed')
      const data = await res.json()

      setActiveCaption(data.caption || '')
      if (data.hashtags?.length > 0) {
        setHashtags((prev) => [...new Set([...prev, ...data.hashtags])])
      }
      toast.success(`${activePlatform} caption generated`)
    } catch {
      toast.error('Failed to generate caption')
    } finally {
      setGeneratingCaption(false)
    }
  }

  function handleCopyAll() {
    const caption = getActiveCaption()
    const hashtagStr = hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
    const full = [caption, hashtagStr].filter(Boolean).join('\n\n')
    navigator.clipboard.writeText(full)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function addHashtag() {
    const tag = hashtagInput.trim().replace(/^#/, '')
    if (tag && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag])
    }
    setHashtagInput('')
  }

  function removeHashtag(tag: string) {
    setHashtags(hashtags.filter((h) => h !== tag))
  }

  function handleDownload() {
    const src = getImageSrc()
    if (!src) return
    const link = document.createElement('a')
    link.href = src
    link.download = name || 'creative'
    link.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-ocean-600" />
      </div>
    )
  }

  if (!image) return null

  const imageSrc = getImageSrc()
  const platforms: { id: Platform; label: string; icon: string }[] = [
    { id: 'instagram', label: 'Instagram', icon: '' },
    { id: 'facebook', label: 'Facebook', icon: '' },
    { id: 'twitter', label: 'X / Twitter', icon: '' },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-warm-400 mb-1">
              <Link href="/creative-hub" className="hover:text-warm-600 transition-colors">
                Content
              </Link>
              <span>/</span>
              <Link href="/creative-hub/images" className="hover:text-warm-600 transition-colors">
                Creatives
              </Link>
              <span>/</span>
              <span className="text-warm-500 truncate max-w-50">{name}</span>
            </div>
            <h1 className="text-xl font-semibold text-warm-900">Edit Creative</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
            <Button
              size="sm"
              className="bg-warm-900 hover:bg-warm-800 text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Two-Column Layout — 1/3 image, 2/3 form */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: Image Card */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg border border-warm-200 overflow-hidden">
            <div
              className="relative aspect-square cursor-pointer group"
              onClick={() => setLightboxOpen(true)}
            >
              {imageSrc && (
                <img
                  src={imageSrc}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-70 transition-opacity" />
              </div>
            </div>

            <div className="flex items-center justify-between px-3 py-2.5 border-t border-warm-100">
              <div className="flex items-center gap-2">
                {image.isAiGenerated && (
                  <Badge className="bg-ocean-500 text-white text-[10px]">AI Generated</Badge>
                )}
                <span className="text-xs text-warm-500 capitalize">
                  {image.imageType.replace('_', ' ')} &middot; {image.aspectRatio}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleDownload}>
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            </div>
          </div>

          {/* Status & Queue — moved below image on left side */}
          <div className="bg-white rounded-lg border border-warm-200 p-5 mt-4">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-warm-600 mb-2 block">Status</label>
                <div className="flex gap-1">
                  {['draft', 'approved', 'archived'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`flex-1 px-3 py-1.5 rounded-sm text-sm font-medium border transition-colors capitalize ${
                        status === s
                          ? s === 'draft'
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : s === 'approved'
                              ? 'bg-green-50 border-green-300 text-green-700'
                              : 'bg-warm-100 border-warm-300 text-warm-600'
                          : 'bg-white border-warm-200 text-warm-400 hover:border-warm-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-warm-600 mb-2 block">Queue Status</label>
                <p className="text-[10px] text-warm-400 mb-1.5">
                  Pending = ready to post, Passed = skip, Posted = done
                </p>
                <div className="flex gap-1">
                  {['pending', 'passed', 'posted'].map((q) => (
                    <button
                      key={q}
                      onClick={() => setQueueStatus(q)}
                      className={`flex-1 px-3 py-1.5 rounded-sm text-sm font-medium border transition-colors capitalize ${
                        queueStatus === q
                          ? q === 'pending'
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : q === 'passed'
                              ? 'bg-warm-100 border-warm-300 text-warm-600'
                              : 'bg-green-50 border-green-300 text-green-700'
                          : 'bg-white border-warm-200 text-warm-400 hover:border-warm-300'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-warm-600 mb-1 block">Priority Rank</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={priorityRank}
                    onChange={(e) => setPriorityRank(e.target.value)}
                    placeholder="—"
                    className="w-20 text-sm h-8"
                  />
                  {priorityRank && (
                    <button
                      onClick={() => setPriorityRank('')}
                      className="text-xs text-warm-400 hover:text-warm-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-warm-400 mt-1">
                  Lower numbers = higher priority (1 is first)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="md:col-span-2 space-y-5">
          {/* Social Media Copy */}
          <div className="bg-white rounded-lg border border-warm-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold text-warm-900">Social Media Copy</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateCaption}
                disabled={generatingCaption}
              >
                {generatingCaption ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                )}
                Generate with AI
              </Button>
            </div>
            <p className="text-xs text-warm-400 mb-4">
              Add captions and messaging for each platform. Use the copy buttons to easily paste into scheduling tools.
            </p>

            {/* Platform tabs */}
            <div className="flex gap-1 mb-3 border-b border-warm-100">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActivePlatform(p.id)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activePlatform === p.id
                      ? 'border-ocean-500 text-ocean-700'
                      : 'border-transparent text-warm-400 hover:text-warm-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Caption */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-warm-600">Caption</label>
                <button
                  onClick={handleCopyAll}
                  className="text-xs text-ocean-600 hover:text-ocean-700 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy All'}
                </button>
              </div>
              <textarea
                value={getActiveCaption()}
                onChange={(e) => setActiveCaption(e.target.value)}
                rows={5}
                className="w-full border border-warm-200 rounded-sm px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ocean-300"
                placeholder={`Write your ${activePlatform} caption...`}
              />
              <p className="text-xs text-warm-400 mt-1">
                {getActiveCaption().length} characters
              </p>
            </div>

            {/* Hashtags */}
            <div>
              <label className="text-xs font-medium text-warm-600 mb-1 block">Hashtags</label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addHashtag()
                    }
                  }}
                  placeholder="Add hashtag..."
                  className="text-sm h-8"
                />
                <Button size="sm" variant="outline" onClick={addHashtag} className="h-8">
                  Add
                </Button>
              </div>
              {hashtags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-warm-100 text-warm-700 rounded-full text-xs"
                    >
                      #{tag}
                      <button
                        onClick={() => removeHashtag(tag)}
                        className="hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="mt-4 bg-warm-50 rounded-sm border border-warm-100 p-3">
              <p className="text-xs font-medium text-warm-600 mb-1.5">Tips for great social copy</p>
              <ul className="text-[11px] text-warm-500 space-y-0.5">
                <li>&bull; Instagram: Use 3-5 relevant hashtags for discoverability</li>
                <li>&bull; Facebook: Keep it conversational and include a call-to-action</li>
                <li>&bull; X/Twitter: Short and punchy works best &mdash; use threads for longer content</li>
              </ul>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg border border-warm-200 p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-warm-600 mb-1 block">Title</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-warm-600 mb-1 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-warm-200 rounded-sm px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ocean-300"
                placeholder="Add a description..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-warm-600 mb-1 block">Campaign</label>
              <Input
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="e.g., Summer 2026"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-warm-600 mb-1 block">Tags (comma-separated)</label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g., instagram, lifestyle"
                className="text-sm"
              />
            </div>
          </div>

          {/* Generation Prompt */}
          {image.aiPrompt && (
            <div className="bg-white rounded-lg border border-warm-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-warm-600">Generation Prompt</h3>
                <Link
                  href={`/creative-hub/generate?prompt=${encodeURIComponent(image.aiPrompt)}`}
                >
                  <Button variant="outline" size="sm">
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Reuse Prompt
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-warm-600 whitespace-pre-wrap bg-warm-50 rounded-sm p-3 border border-warm-100 max-h-40 overflow-y-auto">
                {image.aiPrompt}
              </p>
              {image.aiModel && (
                <p className="text-[10px] text-warm-400 mt-1.5">
                  Model: {image.aiModel}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox — shows all gallery images with navigation */}
      <ImageLightbox
        images={
          allImages.length > 0
            ? allImages.map((img) => ({
                id: img.id,
                src: getGalleryImageSrc(img),
                name: img.name,
              }))
            : imageSrc
              ? [{ id: image.id, src: imageSrc, name }]
              : []
        }
        currentIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
        onViewDetails={(detailId) => {
          setLightboxOpen(false)
          if (detailId !== id) {
            router.push(`/creative-hub/images/${detailId}`)
          }
        }}
      />
    </div>
  )
}
