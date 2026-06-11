'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Mail,
  MessageSquare,
  Linkedin,
  Instagram,
  Plus,
  Edit,
  Trash2,
  Loader2,
  FileText,
  MoreHorizontal,
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
        return <Mail className="size-3.5 text-muted-foreground" />
      case 'sms':
        return <MessageSquare className="size-3.5 text-muted-foreground" />
      case 'linkedin':
        return <Linkedin className="size-3.5 text-muted-foreground" />
      case 'instagram_dm':
        return <Instagram className="size-3.5 text-muted-foreground" />
      default:
        return <MessageSquare className="size-3.5 text-muted-foreground" />
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
          <h2 className="font-display text-lg font-bold tracking-[-0.2px] text-foreground">Message Templates</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Create and manage reusable message templates
          </p>
        </div>
        <Link href="/growth/outreach/templates/new">
          <Button variant="gold">
            <Plus className="size-3.5" />
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
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={FileText}
              title="No templates here yet"
              description="Save your best-performing messages once and reuse them across every channel."
              action={
                <Link href="/growth/outreach/templates/new">
                  <Button variant="outline">
                    <Plus className="size-3.5" />
                    Create Your First Template
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="transition-colors hover:border-primary/40">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm">{template.name}</CardTitle>
                    <CardDescription className="mt-1">
                      <div className="flex items-center gap-1.5">
                        {getChannelIcon(template.channel)}
                        <span className="text-xs capitalize text-muted-foreground">{template.channel}</span>
                      </div>
                    </CardDescription>
                  </div>
                  <Badge variant="neutral" className="font-mono tabular-nums">
                    Used {template.useCount}x
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {template.subject && (
                    <div>
                      <p className="kicker mb-1 text-muted-foreground">Subject</p>
                      <p className="text-xs text-foreground">{template.subject}</p>
                    </div>
                  )}
                  <div>
                    <p className="kicker mb-1 text-muted-foreground">Body</p>
                    <p className="line-clamp-3 text-xs text-muted-foreground">{template.body}</p>
                  </div>
                  <div className="flex items-center gap-2 border-t border-border pt-2">
                    <Link href={`/growth/outreach/templates/${template.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        <Edit className="size-3" />
                        Edit
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          aria-label="More actions"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
