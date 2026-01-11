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
        return <Mail className="h-4 w-4" />
      case 'sms':
        return <MessageSquare className="h-4 w-4" />
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />
      case 'instagram_dm':
        return <Instagram className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
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
          <h2 className="text-2xl font-bold">Message Templates</h2>
          <p className="text-muted-foreground mt-1">
            Create and manage reusable message templates
          </p>
        </div>
        <Link href="/growth/outreach/templates/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by channel" />
          </SelectTrigger>
          <SelectContent>
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
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No templates found</p>
            <Link href="/growth/outreach/templates/new">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Template
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(template.channel)}
                        <span className="capitalize">{template.channel}</span>
                      </div>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Used {template.useCount}x
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {template.subject && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Subject:</p>
                      <p className="text-sm">{template.subject}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Body:</p>
                    <p className="text-sm line-clamp-3">{template.body}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Link href={`/growth/outreach/templates/${template.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
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
