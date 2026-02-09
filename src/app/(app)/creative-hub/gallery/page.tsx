'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  FileText,
  Filter,
  Grid,
  List,
  Download,
  Trash2,
  Copy,
  Eye,
  Edit2,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  Upload,
  RefreshCw,
  Link as LinkIcon,
  ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CreativeContent {
  id: string
  contentType: string
  platform: string
  headline?: string
  primaryText: string
  description?: string
  callToAction?: string
  hashtags: string[]
  status: string
  isAiGenerated: boolean
  createdAt: string
  image?: {
    id: string
    imageUrl?: string
    imageBase64?: string
  }
  project?: {
    id: string
    name: string
  }
}

const PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'twitter', label: 'Twitter/X', icon: Twitter },
  { value: 'meta_ad', label: 'Meta Ad', icon: MoreHorizontal },
  { value: 'google_display', label: 'Google Display', icon: MoreHorizontal },
  { value: 'linkedin_ad', label: 'LinkedIn Ad', icon: Linkedin },
]

const CONTENT_TYPES = [
  { value: 'social_post', label: 'Social Post' },
  { value: 'ad_creative', label: 'Ad Creative' },
]

const STATUSES = [
  { value: 'draft', label: 'Draft', icon: Clock, color: 'text-yellow-600' },
  { value: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-green-600' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-600' },
]

export default function ContentGalleryPage() {
  return (
    <Suspense>
      <ContentGalleryContent />
    </Suspense>
  )
}

function ContentGalleryContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [contents, setContents] = useState<CreativeContent[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filter, setFilter] = useState({
    platform: '',
    contentType: '',
    status: '',
  })
  const [selectedContent, setSelectedContent] = useState<CreativeContent | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<{
    headline: string
    primaryText: string
    description: string
    callToAction: string
    hashtags: string
  }>({ headline: '', primaryText: '', description: '', callToAction: '', hashtags: '' })
  const [editImageUrl, setEditImageUrl] = useState('')
  const [showImageOptions, setShowImageOptions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    loadContents()
  }, [filter])

  // Handle URL query params for view/edit
  useEffect(() => {
    const viewId = searchParams.get('view')
    const editId = searchParams.get('edit')

    if ((viewId || editId) && contents.length > 0) {
      const contentId = viewId || editId
      const content = contents.find((c) => c.id === contentId)

      if (content) {
        setSelectedContent(content)
        if (editId) {
          // Open edit dialog
          setEditForm({
            headline: content.headline || '',
            primaryText: content.primaryText,
            description: content.description || '',
            callToAction: content.callToAction || '',
            hashtags: content.hashtags?.join(', ') || '',
          })
          setEditImageUrl('')
          setShowImageOptions(false)
          setShowEdit(true)
        } else {
          // Open preview dialog
          setShowPreview(true)
        }
        // Clear the URL params
        router.replace('/creative-hub/gallery', { scroll: false })
      }
    }
  }, [searchParams, contents, router])

  async function loadContents() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter.platform) params.set('platform', filter.platform)
      if (filter.contentType) params.set('contentType', filter.contentType)
      if (filter.status) params.set('status', filter.status)

      const response = await fetch(`/api/creative-hub/content?${params}`)
      const data = await response.json()
      setContents(data.content || [])
    } catch (error) {
      console.error('Failed to load contents:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this content?')) return

    try {
      await fetch(`/api/creative-hub/content/${id}`, {
        method: 'DELETE',
      })
      setContents(contents.filter((c) => c.id !== id))
    } catch (error) {
      console.error('Failed to delete content:', error)
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await fetch(`/api/creative-hub/content/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setContents(
        contents.map((c) => (c.id === id ? { ...c, status } : c))
      )
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  function copyToClipboard(content: CreativeContent) {
    const text = [
      content.headline,
      content.primaryText,
      content.hashtags?.map((h) => `#${h}`).join(' '),
    ]
      .filter(Boolean)
      .join('\n\n')

    navigator.clipboard.writeText(text)
    alert('Content copied to clipboard!')
  }

  function exportContent(content: CreativeContent) {
    // Export as a text file that's easy to copy-paste
    const text = [
      content.headline ? `HEADLINE:\n${content.headline}\n` : '',
      `CAPTION:\n${content.primaryText}\n`,
      content.description ? `DESCRIPTION:\n${content.description}\n` : '',
      content.callToAction ? `CTA:\n${content.callToAction}\n` : '',
      content.hashtags?.length ? `HASHTAGS:\n${content.hashtags.map(h => '#' + h).join(' ')}\n` : '',
      `\n---\nPlatform: ${content.platform}\nType: ${content.contentType}\nCreated: ${new Date(content.createdAt).toLocaleDateString()}`,
    ].filter(Boolean).join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${content.platform}-content-${content.id}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function downloadImage(content: CreativeContent) {
    const imageSrc = getImageSrc(content)
    if (!imageSrc) return

    try {
      // For base64 images
      if (imageSrc.startsWith('data:')) {
        const link = document.createElement('a')
        link.href = imageSrc
        link.download = `${content.platform}-image-${content.id}.png`
        link.click()
      } else {
        // For URL images, fetch and download
        const response = await fetch(imageSrc)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${content.platform}-image-${content.id}.png`
        link.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to download image:', error)
      alert('Failed to download image')
    }
  }

  function openEditDialog(content: CreativeContent) {
    setSelectedContent(content)
    setEditForm({
      headline: content.headline || '',
      primaryText: content.primaryText,
      description: content.description || '',
      callToAction: content.callToAction || '',
      hashtags: content.hashtags?.join(', ') || '',
    })
    setEditImageUrl('')
    setShowImageOptions(false)
    setShowEdit(true)
  }

  async function handleSaveEdit() {
    if (!selectedContent) return

    setSaving(true)
    try {
      // Update content
      const response = await fetch(`/api/creative-hub/content/${selectedContent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: editForm.headline || undefined,
          primaryText: editForm.primaryText,
          description: editForm.description || undefined,
          callToAction: editForm.callToAction || undefined,
          hashtags: editForm.hashtags.split(',').map(h => h.trim()).filter(Boolean),
        }),
      })

      if (!response.ok) throw new Error('Failed to update content')

      // If we have a new image URL, update the image
      if (editImageUrl && selectedContent.image?.id) {
        await fetch(`/api/creative-hub/images/${selectedContent.image.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: editImageUrl }),
        })
      }

      // Reload contents to reflect changes
      await loadContents()
      setShowEdit(false)
      setSelectedContent(null)
    } catch (error) {
      console.error('Failed to save changes:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !selectedContent) return

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
      setEditImageUrl(data.url)
      setShowImageOptions(false)
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  function getPlatformIcon(platform: string) {
    const p = PLATFORMS.find((pl) => pl.value === platform)
    return p ? p.icon : FileText
  }

  function getStatusInfo(status: string) {
    return STATUSES.find((s) => s.value === status) || STATUSES[0]
  }

  function getImageSrc(content: CreativeContent): string | null {
    if (!content.image) return null
    if (content.image.imageUrl) return content.image.imageUrl
    if (content.image.imageBase64)
      return `data:image/png;base64,${content.image.imageBase64}`
    return null
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/creative-hub">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-charcoal-900">
              Content Gallery
            </h1>
            <p className="text-charcoal-600">
              Browse and manage your marketing content
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Link href="/creative-hub/create">
            <Button className="bg-gradient-to-br from-ocean-500 to-ocean-600">
              <Sparkles className="w-4 h-4 mr-2" />
              Create New
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-charcoal-400" />

            <Select
              value={filter.platform}
              onValueChange={(value) =>
                setFilter({ ...filter, platform: value === 'all' ? '' : value })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filter.contentType}
              onValueChange={(value) =>
                setFilter({
                  ...filter,
                  contentType: value === 'all' ? '' : value,
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {CONTENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filter.status}
              onValueChange={(value) =>
                setFilter({ ...filter, status: value === 'all' ? '' : value })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-ocean-600" />
        </div>
      ) : contents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-charcoal-300 mb-4" />
            <h3 className="text-lg font-semibold text-charcoal-900 mb-2">
              No content yet
            </h3>
            <p className="text-charcoal-600 mb-4">
              Create your first marketing content
            </p>
            <Link href="/creative-hub/create">
              <Button>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Content
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contents.map((content) => {
            const PlatformIcon = getPlatformIcon(content.platform)
            const statusInfo = getStatusInfo(content.status)
            const StatusIcon = statusInfo.icon
            const imageSrc = getImageSrc(content)

            return (
              <Card key={content.id} className="group overflow-hidden">
                {imageSrc && (
                  <div className="aspect-video relative bg-charcoal-100">
                    <img
                      src={imageSrc}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-charcoal-100 rounded">
                        <PlatformIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {content.platform.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-charcoal-500 capitalize">
                          {content.contentType.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <StatusIcon
                        className={`w-4 h-4 ${statusInfo.color}`}
                      />
                      {content.isAiGenerated && (
                        <Badge variant="outline" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Content Preview */}
                  {content.headline && (
                    <p className="font-semibold text-sm line-clamp-1">
                      {content.headline}
                    </p>
                  )}
                  <p className="text-sm text-charcoal-600 line-clamp-3">
                    {content.primaryText}
                  </p>

                  {/* Hashtags */}
                  {content.hashtags && content.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {content.hashtags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs text-ocean-600 bg-ocean-50 px-2 py-0.5 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                      {content.hashtags.length > 3 && (
                        <span className="text-xs text-charcoal-400">
                          +{content.hashtags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-charcoal-400">
                      {new Date(content.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedContent(content)
                          setShowPreview(true)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(content)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(content)}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => exportContent(content)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export Text
                          </DropdownMenuItem>
                          {getImageSrc(content) && (
                            <DropdownMenuItem
                              onClick={() => downloadImage(content)}
                            >
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Download Image
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(content.id, 'approved')
                            }
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(content.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {contents.map((content) => {
            const PlatformIcon = getPlatformIcon(content.platform)
            const statusInfo = getStatusInfo(content.status)
            const StatusIcon = statusInfo.icon
            const imageSrc = getImageSrc(content)

            return (
              <Card key={content.id} className="p-4">
                <div className="flex items-start gap-4">
                  {imageSrc && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-charcoal-100">
                      <img
                        src={imageSrc}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <PlatformIcon className="w-5 h-5" />
                        <span className="font-medium capitalize">
                          {content.platform.replace('_', ' ')}
                        </span>
                        <Badge variant="outline" className="capitalize">
                          {content.contentType.replace('_', ' ')}
                        </Badge>
                        <div className={`flex items-center gap-1 ${statusInfo.color}`}>
                          <StatusIcon className="w-4 h-4" />
                          <span className="text-sm">{statusInfo.label}</span>
                        </div>
                      </div>
                      {content.isAiGenerated && (
                        <Badge className="bg-ocean-500">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Generated
                        </Badge>
                      )}
                    </div>

                    {content.headline && (
                      <p className="font-semibold mb-1">{content.headline}</p>
                    )}
                    <p className="text-charcoal-600 line-clamp-2 mb-2">
                      {content.primaryText}
                    </p>

                    {content.hashtags && content.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {content.hashtags.slice(0, 5).map((tag, i) => (
                          <span
                            key={i}
                            className="text-xs text-ocean-600 bg-ocean-50 px-2 py-0.5 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                        {content.hashtags.length > 5 && (
                          <span className="text-xs text-charcoal-400">
                            +{content.hashtags.length - 5} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-charcoal-400">
                        Created {new Date(content.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedContent(content)
                            setShowPreview(true)
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(content)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportContent(content)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(content.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Content Preview</DialogTitle>
          </DialogHeader>
          {selectedContent && (
            <div className="space-y-4 mt-4">
              {/* Platform Info */}
              <div className="flex items-center gap-2">
                {(() => {
                  const PlatformIcon = getPlatformIcon(selectedContent.platform)
                  return <PlatformIcon className="w-5 h-5" />
                })()}
                <span className="font-medium capitalize">
                  {selectedContent.platform.replace('_', ' ')}
                </span>
                <Badge variant="outline" className="capitalize">
                  {selectedContent.contentType.replace('_', ' ')}
                </Badge>
              </div>

              {/* Image */}
              {getImageSrc(selectedContent) && (
                <div className="rounded-lg overflow-hidden bg-charcoal-100">
                  <img
                    src={getImageSrc(selectedContent)!}
                    alt=""
                    className="w-full h-auto"
                  />
                </div>
              )}

              {/* Content */}
              <div className="space-y-3">
                {selectedContent.headline && (
                  <div>
                    <label className="text-sm font-medium text-charcoal-500">
                      Headline
                    </label>
                    <p className="text-lg font-semibold">
                      {selectedContent.headline}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-charcoal-500">
                    Primary Text
                  </label>
                  <p className="whitespace-pre-wrap">
                    {selectedContent.primaryText}
                  </p>
                </div>

                {selectedContent.description && (
                  <div>
                    <label className="text-sm font-medium text-charcoal-500">
                      Description
                    </label>
                    <p>{selectedContent.description}</p>
                  </div>
                )}

                {selectedContent.callToAction && (
                  <div>
                    <label className="text-sm font-medium text-charcoal-500">
                      Call to Action
                    </label>
                    <p className="font-medium text-ocean-600">
                      {selectedContent.callToAction}
                    </p>
                  </div>
                )}

                {selectedContent.hashtags &&
                  selectedContent.hashtags.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-charcoal-500">
                        Hashtags
                      </label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedContent.hashtags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-sm text-ocean-600 bg-ocean-50 px-2 py-1 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t">
                <Button
                  onClick={() => copyToClipboard(selectedContent)}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportContent(selectedContent)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
          </DialogHeader>
          {selectedContent && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Text Content */}
                <div className="space-y-4">
                  <div>
                    <Label>Headline</Label>
                    <Input
                      value={editForm.headline}
                      onChange={(e) => setEditForm({ ...editForm, headline: e.target.value })}
                      placeholder="Headline (optional)"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Primary Text / Caption</Label>
                    <Textarea
                      value={editForm.primaryText}
                      onChange={(e) => setEditForm({ ...editForm, primaryText: e.target.value })}
                      rows={6}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Input
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Description (optional)"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Call to Action</Label>
                    <Input
                      value={editForm.callToAction}
                      onChange={(e) => setEditForm({ ...editForm, callToAction: e.target.value })}
                      placeholder="Call to action (optional)"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Hashtags (comma-separated)</Label>
                    <Input
                      value={editForm.hashtags}
                      onChange={(e) => setEditForm({ ...editForm, hashtags: e.target.value })}
                      placeholder="austin, local, community"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Right: Image */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-lg font-semibold">Image</Label>
                    <p className="text-sm text-charcoal-500 mb-3">
                      Swap out the AI-generated image with your own
                    </p>
                  </div>

                  {/* Current/New Image Preview */}
                  <div className="relative rounded-lg overflow-hidden bg-charcoal-100 aspect-square">
                    {editImageUrl ? (
                      <img
                        src={editImageUrl}
                        alt="New image"
                        className="w-full h-full object-cover"
                      />
                    ) : getImageSrc(selectedContent) ? (
                      <img
                        src={getImageSrc(selectedContent)!}
                        alt="Current image"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-charcoal-300" />
                      </div>
                    )}
                    {editImageUrl && (
                      <Badge className="absolute top-2 right-2 bg-green-500">
                        New Image
                      </Badge>
                    )}
                  </div>

                  {/* Image Actions */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowImageOptions(!showImageOptions)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Change Image
                    </Button>

                    {showImageOptions && (
                      <div className="p-4 bg-charcoal-50 rounded-lg border space-y-3">
                        {/* Upload */}
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="edit-image-upload"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => document.getElementById('edit-image-upload')?.click()}
                            disabled={uploadingImage}
                          >
                            {uploadingImage ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            Upload from Computer
                          </Button>
                        </div>

                        {/* URL Input */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Or paste image URL..."
                            value={editImageUrl}
                            onChange={(e) => setEditImageUrl(e.target.value)}
                            className="text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowImageOptions(false)}
                          >
                            <LinkIcon className="w-4 h-4" />
                          </Button>
                        </div>

                        <p className="text-xs text-charcoal-500">
                          Tip: Use a real photo of the business or location for authenticity
                        </p>
                      </div>
                    )}

                    {editImageUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => setEditImageUrl('')}
                      >
                        Remove new image
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowEdit(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="bg-ocean-600 hover:bg-ocean-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
