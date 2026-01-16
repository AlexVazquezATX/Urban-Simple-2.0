'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

  useEffect(() => {
    loadContents()
  }, [filter])

  async function loadContents() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter.platform) params.set('platform', filter.platform)
      if (filter.contentType) params.set('contentType', filter.contentType)
      if (filter.status) params.set('status', filter.status)

      const response = await fetch(`/api/creative-hub/content?${params}`)
      const data = await response.json()
      setContents(data.contents || [])
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
    const data = {
      platform: content.platform,
      contentType: content.contentType,
      headline: content.headline,
      primaryText: content.primaryText,
      description: content.description,
      callToAction: content.callToAction,
      hashtags: content.hashtags,
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${content.platform}-content-${content.id}.json`
    link.click()
    URL.revokeObjectURL(url)
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
                            onClick={() => exportContent(content)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </DropdownMenuItem>
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
    </div>
  )
}
