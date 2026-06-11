'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Sparkles,
  Brain,
  TrendingUp,
  MapPin,
  Heart,
  Globe,
  Cpu,
  Lightbulb,
} from 'lucide-react'
import { PulseTopicForm } from './pulse-topic-form'
import { TOPIC_TEMPLATES, TOPIC_CATEGORIES } from '@/features/pulse/types/pulse-types'

interface Topic {
  id: string
  name: string
  description: string | null
  keywords: string[]
  category: string
  priority: number
  isActive: boolean
  _count: {
    briefingItems: number
  }
}

interface PulseTopicManagerProps {
  topics: Topic[]
}

const categoryIcons: Record<string, any> = {
  tech: Cpu,
  business: TrendingUp,
  local: MapPin,
  industry: Sparkles,
  personal: Heart,
  general: Globe,
}

export function PulseTopicManager({ topics: initialTopics }: PulseTopicManagerProps) {
  const [topics, setTopics] = useState(initialTopics)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  const handleToggleActive = async (topic: Topic) => {
    try {
      const response = await fetch(`/api/admin/pulse/topics/${topic.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !topic.isActive }),
      })

      if (!response.ok) throw new Error('Failed to update topic')

      setTopics((prev) =>
        prev.map((t) =>
          t.id === topic.id ? { ...t, isActive: !t.isActive } : t
        )
      )

      toast.success(
        `Topic ${!topic.isActive ? 'enabled' : 'disabled'}`
      )
    } catch (error) {
      toast.error('Failed to update topic')
    }
  }

  const handleDelete = async () => {
    if (!topicToDelete) return

    try {
      const response = await fetch(
        `/api/admin/pulse/topics/${topicToDelete.id}`,
        { method: 'DELETE' }
      )

      if (!response.ok) throw new Error('Failed to delete topic')

      setTopics((prev) => prev.filter((t) => t.id !== topicToDelete.id))
      toast.success('Topic deleted')
    } catch (error) {
      toast.error('Failed to delete topic')
    } finally {
      setDeleteDialogOpen(false)
      setTopicToDelete(null)
    }
  }

  const handleAddTemplate = async (template: typeof TOPIC_TEMPLATES[0]) => {
    try {
      const response = await fetch('/api/admin/pulse/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          keywords: template.keywords,
          category: template.category,
          priority: 50,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add topic')
      }

      const data = await response.json()

      // Add the new topic to local state
      setTopics((prev) => [...prev, data.topic])

      toast.success(`Added "${template.name}" to your topics`)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const activeTopics = topics.filter((t) => t.isActive)
  const inactiveTopics = topics.filter((t) => !t.isActive)

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        kicker="PULSE · TOPICS"
        title="Manage Topics"
        subtitle="Customize what appears in your daily briefing"
        backHref="/pulse"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <PulseTopicForm onSuccess={(newTopic) => {
              if (newTopic) {
                setTopics((prev) => [...prev, newTopic])
              }
            }}>
              <Button variant="gold">
                <Plus className="h-4 w-4 mr-2" />
                Add Topic
              </Button>
            </PulseTopicForm>
          </>
        }
      />

      {/* Quick Add Templates */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Add Templates</CardTitle>
                <CardDescription>
                  Click to instantly add pre-configured topics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {TOPIC_TEMPLATES.map((template) => {
                    const exists = topics.some(
                      (t) => t.name.toLowerCase() === template.name.toLowerCase()
                    )
                    const Icon = categoryIcons[template.category] || Globe

                    return (
                      <Button
                        key={template.name}
                        variant="outline"
                        className="h-auto py-3 px-4 justify-start"
                        disabled={exists}
                        onClick={() => handleAddTemplate(template)}
                      >
                        <Icon className="h-4 w-4 mr-2 shrink-0" />
                        <span className="truncate text-sm">
                          {template.name}
                          {exists && ' (Added)'}
                        </span>
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Topics */}
      {activeTopics.length > 0 && (
        <div className="space-y-3">
          <h2 className="kicker flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-300" />
            Active Topics ({activeTopics.length})
          </h2>
          <div className="grid gap-3">
            {activeTopics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                onToggle={() => handleToggleActive(topic)}
                onDelete={() => {
                  setTopicToDelete(topic)
                  setDeleteDialogOpen(true)
                }}
                onEdit={(updatedTopic) => {
                  if (updatedTopic) {
                    setTopics((prev) =>
                      prev.map((t) => (t.id === updatedTopic.id ? updatedTopic : t))
                    )
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Topics */}
      {inactiveTopics.length > 0 && (
        <div className="space-y-3">
          <h2 className="kicker flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            Inactive Topics ({inactiveTopics.length})
          </h2>
          <div className="grid gap-3 opacity-70">
            {inactiveTopics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                onToggle={() => handleToggleActive(topic)}
                onDelete={() => {
                  setTopicToDelete(topic)
                  setDeleteDialogOpen(true)
                }}
                onEdit={(updatedTopic) => {
                  if (updatedTopic) {
                    setTopics((prev) =>
                      prev.map((t) => (t.id === updatedTopic.id ? updatedTopic : t))
                    )
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {topics.length === 0 && (
        <Card className="py-8">
          <EmptyState
            icon={Brain}
            title="No topics yet"
            description="Add a few topics and Pulse will build you a personalized briefing every morning."
            action={
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowTemplates(true)}>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Browse Templates
                </Button>
                <PulseTopicForm onSuccess={(newTopic) => {
                  if (newTopic) {
                    setTopics((prev) => [...prev, newTopic])
                  }
                }}>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Custom Topic
                  </Button>
                </PulseTopicForm>
              </div>
            }
          />
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Topic</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{topicToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TopicCard({
  topic,
  onToggle,
  onDelete,
  onEdit,
}: {
  topic: Topic
  onToggle: () => void
  onDelete: () => void
  onEdit: (updatedTopic?: Topic) => void
}) {
  const Icon = categoryIcons[topic.category] || Globe
  const categoryLabel =
    TOPIC_CATEGORIES.find((c) => c.value === topic.category)?.label || topic.category

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-gold-600/10 dark:bg-gold-400/12">
              <Icon className="h-[18px] w-[18px] text-gold-600 dark:text-gold-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{topic.name}</h3>
                <Badge variant="neutral" className="shrink-0">
                  {categoryLabel}
                </Badge>
                {topic.priority > 50 && (
                  <Badge variant="gold" className="shrink-0">
                    High Priority
                  </Badge>
                )}
              </div>
              {topic.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {topic.description}
                </p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {topic.keywords.slice(0, 5).map((keyword) => (
                  <Badge key={keyword} variant="neutral">
                    {keyword}
                  </Badge>
                ))}
                {topic.keywords.length > 5 && (
                  <Badge variant="neutral">
                    +{topic.keywords.length - 5} more
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-mono tabular-nums">
                {topic._count.briefingItems} items generated
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={topic.isActive} onCheckedChange={onToggle} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <PulseTopicForm topic={topic} onSuccess={onEdit}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                </PulseTopicForm>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
