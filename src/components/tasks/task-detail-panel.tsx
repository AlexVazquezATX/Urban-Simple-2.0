'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Loader2,
  Calendar,
  Flag,
  FolderKanban,
  Tag,
  Star,
  Target,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  scheduledDate: string | null
  completedAt: string | null
  isFocusTask: boolean
  focusReason: string | null
  focusPriority: number | null
  isStarred: boolean
  starredAt: string | null
  loggedMinutes: number
  completionPercent: number
  createdAt: string
  project: {
    id: string
    name: string
    color: string
  } | null
  goal: {
    id: string
    title: string
    color: string
    period: string
  } | null
  tags: Array<{
    tag: {
      id: string
      name: string
      color: string
    }
  }>
  links: Array<{
    id: string
    entityType: string
    entityId: string
    entityLabel: string | null
  }>
}

interface Project {
  id: string
  name: string
  color: string
}

interface TaskTag {
  id: string
  name: string
  color: string
}

interface Goal {
  id: string
  title: string
  color: string
  period: string
}

interface TaskDetailPanelProps {
  task: Task | null
  isNew?: boolean
  projects: Project[]
  onClose: () => void
  onSave: (savedTask?: Task) => void
  onDelete?: (taskId: string) => void
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-muted-foreground' },
  { value: 'medium', label: 'Medium', color: 'text-gold-600 dark:text-gold-400' },
  { value: 'high', label: 'High', color: 'text-coral-600 dark:text-coral-300' },
  { value: 'urgent', label: 'Urgent', color: 'text-coral-600 dark:text-coral-300' },
]

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do', icon: Circle },
  { value: 'in_progress', label: 'In Progress', icon: Clock },
  { value: 'done', label: 'Done', icon: CheckCircle2 },
  { value: 'cancelled', label: 'Cancelled', icon: Circle },
]

export function TaskDetailPanel({ task, isNew, projects, onClose, onSave, onDelete }: TaskDetailPanelProps) {
  const [loading, setLoading] = useState(false)
  const [tags, setTags] = useState<TaskTag[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [isVisible, setIsVisible] = useState(false)

  // Form state
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [status, setStatus] = useState(task?.status || 'todo')
  const [priority, setPriority] = useState(task?.priority || 'medium')
  const [projectId, setProjectId] = useState<string | null>(task?.project?.id || null)
  const [goalId, setGoalId] = useState<string | null>(task?.goal?.id || null)
  const [dueDate, setDueDate] = useState(task?.dueDate?.split('T')[0] || '')
  const [scheduledDate, setScheduledDate] = useState(task?.scheduledDate?.split('T')[0] || '')
  const [isStarred, setIsStarred] = useState(task?.isStarred || false)
  const [loggedHours, setLoggedHours] = useState(Math.floor((task?.loggedMinutes || 0) / 60))
  const [loggedMins, setLoggedMins] = useState((task?.loggedMinutes || 0) % 60)
  const [completionPercent, setCompletionPercent] = useState(task?.completionPercent || 0)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    task?.tags.map(t => t.tag.id) || []
  )
  const [newTagName, setNewTagName] = useState('')

  // Trigger slide-in animation
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  // Reset form when task changes
  useEffect(() => {
    setTitle(task?.title || '')
    setDescription(task?.description || '')
    setStatus(task?.status || 'todo')
    setPriority(task?.priority || 'medium')
    setProjectId(task?.project?.id || null)
    setGoalId(task?.goal?.id || null)
    setDueDate(task?.dueDate?.split('T')[0] || '')
    setScheduledDate(task?.scheduledDate?.split('T')[0] || '')
    setIsStarred(task?.isStarred || false)
    setLoggedHours(Math.floor((task?.loggedMinutes || 0) / 60))
    setLoggedMins((task?.loggedMinutes || 0) % 60)
    setCompletionPercent(task?.completionPercent || 0)
    setSelectedTagIds(task?.tags.map(t => t.tag.id) || [])
  }, [task])

  useEffect(() => {
    loadTags()
    loadGoals()
  }, [])

  const loadTags = async () => {
    try {
      const response = await fetch('/api/tasks/tags')
      const data = await response.json()
      if (Array.isArray(data)) {
        setTags(data)
      } else {
        setTags([])
      }
    } catch (error) {
      console.error('Failed to load tags:', error)
      setTags([])
    }
  }

  const loadGoals = async () => {
    try {
      const response = await fetch('/api/goals/current')
      const data = await response.json()
      const allGoals: Goal[] = [
        ...(data.weekly || []).map((g: Goal) => ({ id: g.id, title: g.title, color: g.color, period: g.period })),
        ...(data.monthly || []).map((g: Goal) => ({ id: g.id, title: g.title, color: g.color, period: g.period })),
      ]
      setGoals(allGoals)
    } catch (error) {
      console.error('Failed to load goals:', error)
      setGoals([])
    }
  }

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(onClose, 200) // Wait for animation
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      const url = task && !isNew ? `/api/tasks/${task.id}` : '/api/tasks'
      const method = task && !isNew ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          projectId: projectId || null,
          goalId: goalId || null,
          dueDate: dueDate || null,
          scheduledDate: scheduledDate || null,
          isStarred,
          loggedMinutes: loggedHours * 60 + loggedMins,
          completionPercent,
          tagIds: selectedTagIds,
        }),
      })

      if (response.ok) {
        const savedTask = await response.json()
        onSave({
          ...savedTask,
          tags: savedTask.tags || [],
          links: savedTask.links || [],
        })
        handleClose()
      }
    } catch (error) {
      console.error('Failed to save task:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    if (task && onDelete) {
      onDelete(task.id)
      handleClose()
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    try {
      const response = await fetch('/api/tasks/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
        }),
      })

      if (response.ok) {
        const newTag = await response.json()
        setTags([...tags, newTag])
        setSelectedTagIds([...selectedTagIds, newTag.id])
        setNewTagName('')
      }
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-ink-950/30 transition-opacity duration-200',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full max-w-md bg-card shadow-elevated border-l border-border flex flex-col transition-transform duration-200 ease-out',
          isVisible ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/50">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-bold tracking-[-0.4px] text-foreground">
              {task && !isNew ? 'Edit Task' : 'New Task'}
            </h2>
            <button
              type="button"
              onClick={() => setIsStarred(!isStarred)}
              className={cn(
                'p-1.5 rounded-[9px] transition-all',
                isStarred
                  ? 'text-gold-600 bg-gold-600/10 dark:text-gold-400 dark:bg-gold-400/12'
                  : 'text-muted-foreground hover:text-gold-600 hover:bg-secondary dark:hover:text-gold-400'
              )}
              title={isStarred ? 'Unstar task' : 'Star task'}
            >
              <Star className={cn('w-5 h-5', isStarred && 'fill-current')} />
            </button>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-[9px] hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => {
                    const Icon = opt.icon
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Flag className="w-4 h-4" />
                Priority
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className={opt.color}>{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project & Goal Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4" />
                Project
              </Label>
              <Select
                value={projectId || 'none'}
                onValueChange={(v) => setProjectId(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Goal
              </Label>
              <Select
                value={goalId || 'none'}
                onValueChange={(v) => setGoalId(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No goal</SelectItem>
                  {goals.length > 0 && (
                    <>
                      {goals.filter(g => g.period === 'weekly').length > 0 && (
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                          This Week
                        </div>
                      )}
                      {goals.filter(g => g.period === 'weekly').map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: goal.color }}
                            />
                            {goal.title}
                          </span>
                        </SelectItem>
                      ))}
                      {goals.filter(g => g.period === 'monthly').length > 0 && (
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                          This Month
                        </div>
                      )}
                      {goals.filter(g => g.period === 'monthly').map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: goal.color }}
                            />
                            {goal.title}
                          </span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Due Date
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Scheduled
              </Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
          </div>

          {/* Time logged */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time logged
            </Label>
            <div className="flex items-center gap-3">
              <div className="relative w-24">
                <Input
                  type="number"
                  min={0}
                  value={loggedHours}
                  onChange={(e) => setLoggedHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="pr-9"
                  aria-label="Hours"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">hr</span>
              </div>
              <div className="relative w-24">
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={loggedMins}
                  onChange={(e) => setLoggedMins(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="pr-11"
                  aria-label="Minutes"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">min</span>
              </div>
              <span className="text-xs text-muted-foreground">of real work</span>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label>Progress</Label>
              <span className="font-mono text-sm tabular-nums text-foreground">{completionPercent}%</span>
            </div>
            <Slider
              value={[completionPercent]}
              min={0}
              max={100}
              step={5}
              onValueChange={([v]) => setCompletionPercent(v)}
              aria-label="Completion percent"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </Label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    'px-3 py-1 rounded-full text-sm border transition-colors',
                    selectedTagIds.includes(tag.id)
                      ? 'border-transparent'
                      : 'border-border bg-secondary/60 text-muted-foreground hover:text-foreground'
                  )}
                  style={selectedTagIds.includes(tag.id) ? {
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                    borderColor: tag.color,
                  } : undefined}
                >
                  {tag.name}
                </button>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="New tag..."
                  className="h-8 w-24 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCreateTag()
                    }
                  }}
                />
                {newTagName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCreateTag}
                  >
                    Add
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions - Fixed */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border bg-card">
          {task && !isNew && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              className="text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !title.trim()}
              variant="gold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : task && !isNew ? (
                'Save Changes'
              ) : (
                'Create Task'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
