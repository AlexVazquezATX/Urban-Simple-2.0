'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Mail,
  MessageSquare,
  Linkedin,
  Instagram,
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export function TemplateLibrary() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterChannel, setFilterChannel] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchTemplates()
  }, [filterChannel])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const url = filterChannel === 'all'
        ? '/api/growth/outreach/templates'
        : `/api/growth/outreach/templates?channel=${filterChannel}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/growth/outreach/templates/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast.success('Template deleted')
      fetchTemplates()
    } catch (error) {
      toast.error('Failed to delete template')
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-3.5 w-3.5 text-ocean-500" />
      case 'sms':
        return <MessageSquare className="h-3.5 w-3.5 text-lime-600" />
      case 'linkedin':
        return <Linkedin className="h-3.5 w-3.5 text-ocean-600" />
      case 'instagram_dm':
        return <Instagram className="h-3.5 w-3.5 text-plum-500" />
      default:
        return <MessageSquare className="h-3.5 w-3.5 text-warm-500" />
    }
  }

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.body.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-medium text-warm-900">Message Templates</h2>
          <p className="text-sm text-warm-500 mt-0.5">
            Create and manage reusable message templates
          </p>
        </div>
        <Link href="/growth/outreach/templates/new">
          <Button variant="lime" className="rounded-sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Template
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm rounded-sm border-warm-200"
          />
        </div>
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-[180px] rounded-sm border-warm-200">
            <SelectValue placeholder="Filter by channel" />
          </SelectTrigger>
          <SelectContent className="rounded-sm">
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="instagram_dm">Instagram DM</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-warm-400" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="rounded-sm border-warm-200">
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-warm-300" />
            <p className="text-sm text-warm-500 mb-4">No templates found</p>
            <Link href="/growth/outreach/templates/new">
              <Button variant="outline" className="rounded-sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create Your First Template
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="rounded-sm border-warm-200 hover:border-ocean-400 transition-colors">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-medium text-warm-900">{template.name}</CardTitle>
                    <CardDescription className="mt-1">
                      <div className="flex items-center gap-1.5">
                        {getChannelIcon(template.channel)}
                        <span className="text-xs text-warm-500 capitalize">{template.channel}</span>
                      </div>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300">
                    Used {template.useCount}x
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  {template.subject && (
                    <div>
                      <p className="text-[10px] font-medium text-warm-500 uppercase tracking-wide mb-0.5">Subject:</p>
                      <p className="text-xs text-warm-700">{template.subject}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-medium text-warm-500 uppercase tracking-wide mb-0.5">Body:</p>
                    <p className="text-xs text-warm-600 line-clamp-3">{template.body}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-warm-100">
                    <Link href={`/growth/outreach/templates/${template.id}`}>
                      <Button variant="outline" size="sm" className="rounded-sm h-7 px-2 text-xs">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="rounded-sm h-7 px-2 text-xs text-warm-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
