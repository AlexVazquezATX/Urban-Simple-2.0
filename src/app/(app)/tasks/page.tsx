'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  CheckSquare,
  Plus,
  Filter,
  Loader2,
  ChevronDown,
  Sparkles,
  Circle,
  CheckCircle2,
  Check,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderKanban,
  Target,
  LayoutList,
  Columns3,
  CalendarDays,
  Search,
  X,
  ArrowUpRight,
  Star,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { cn } from '@/lib/utils'
import { TaskForm } from '@/components/tasks/task-form'
import { TaskDetailPanel } from '@/components/tasks/task-detail-panel'
import { ProjectForm } from '@/components/tasks/project-form'
import { GoalsSection } from '@/components/tasks/goals-section'
import Link from 'next/link'

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
  description: string | null
  color: string
  status: string
  dueDate: string | null
  taskCount?: number
  openTaskCount?: number
}

interface TaskStats {
  byStatus: Record<string, number>
  overdue: number
  dueToday: number
  total: number
}

/* Priority → 3px color bar (high/urgent → coral, medium → gold, low → muted) */
const PRIORITY_BAR_COLORS: Record<string, string> = {
  urgent: 'bg-coral-600 dark:bg-coral-300',
  high: 'bg-coral-600 dark:bg-coral-300',
  medium: 'bg-gold-600 dark:bg-gold-400',
  low: 'bg-muted-foreground/40',
}

const PRIORITY_DOT_COLORS: Record<string, string> = {
  urgent: 'bg-coral-600 dark:bg-coral-300',
  high: 'bg-coral-600 dark:bg-coral-300',
  medium: 'bg-gold-600 dark:bg-gold-400',
  low: 'bg-muted-foreground/40',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  todo: <Circle className="size-4 text-muted-foreground" />,
  in_progress: <Clock className="size-4 text-teal-600 dark:text-teal-300" />,
  done: <CheckCircle2 className="size-4 text-green-600 dark:text-green-300" />,
  cancelled: <Circle className="size-4 text-muted-foreground/50" />,
}

type ViewMode = 'list' | 'board' | 'calendar'

const VIEW_OPTIONS: Array<{ mode: ViewMode; label: string; icon: LucideIcon }> = [
  { mode: 'list', label: 'List', icon: LayoutList },
  { mode: 'board', label: 'Board', icon: Columns3 },
  { mode: 'calendar', label: 'Calendar', icon: CalendarDays },
]

function formatDueDate(date: string | null) {
  if (!date) return null
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const taskDate = new Date(d)
  taskDate.setHours(0, 0, 0, 0)

  if (taskDate.getTime() === today.getTime()) return 'Today'
  if (taskDate.getTime() === tomorrow.getTime()) return 'Tomorrow'
  if (taskDate < today) return `${Math.floor((today.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24))}d overdue`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(date: string | null) {
  if (!date) return false
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

/* Group tasks into mockup's kicker-divided sections: Today (incl. overdue),
   This week, Later, No due date. Presentation only. */
function groupTasksByDue(tasks: Task[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekOut = new Date(today)
  weekOut.setDate(weekOut.getDate() + 7)

  const buckets: Record<'today' | 'week' | 'later' | 'nodate', Task[]> = {
    today: [],
    week: [],
    later: [],
    nodate: [],
  }

  for (const task of tasks) {
    if (!task.dueDate) {
      buckets.nodate.push(task)
      continue
    }
    const d = new Date(task.dueDate)
    d.setHours(0, 0, 0, 0)
    if (d.getTime() <= today.getTime()) buckets.today.push(task)
    else if (d < weekOut) buckets.week.push(task)
    else buckets.later.push(task)
  }

  return [
    { key: 'today', label: 'Today', gold: true, tasks: buckets.today },
    { key: 'week', label: 'This week', gold: false, tasks: buckets.week },
    { key: 'later', label: 'Later', gold: false, tasks: buckets.later },
    { key: 'nodate', label: 'No due date', gold: false, tasks: buckets.nodate },
  ].filter((group) => group.tasks.length > 0)
}

/* Projects-rail row — active = gold dim fill + gold border + gold text */
function projectRowClass(active: boolean) {
  return cn(
    'flex w-full items-center gap-2.5 rounded-[8px] border px-2.5 py-[7px] text-[13.5px] transition-colors',
    active
      ? 'border-gold-600/30 bg-gold-600/10 font-semibold text-gold-600 dark:border-gold-400/25 dark:bg-gold-400/12 dark:text-gold-400'
      : 'border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
  )
}

export default function TasksPage() {
  return (
    <Suspense>
      <TasksContent />
    </Suspense>
  )
}

function TasksContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Filters
  const [statusFilter, setStatusFilter] = useState<string[]>(['todo', 'in_progress'])
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null)

  // Modal states
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null) // For slide-in panel
  const [showProjectSidebar, setShowProjectSidebar] = useState(true)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  // Handle ?new=true query param to auto-open new task form (for mobile quick-add)
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setShowTaskForm(true)
      // Remove the query param from URL without navigation
      router.replace('/tasks', { scroll: false })
    }
  }, [searchParams, router])

  const loadTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter.length > 0) {
        params.set('status', statusFilter.join(','))
      }
      // Handle special 'starred' filter - don't pass as projectId
      if (projectFilter && projectFilter !== 'starred') {
        params.set('projectId', projectFilter)
      }
      if (projectFilter === 'starred') {
        params.set('isStarred', 'true')
      }
      if (priorityFilter) {
        params.set('priority', priorityFilter)
      }
      params.set('includeProject', 'true')
      params.set('includeTags', 'true')
      // Don't include links in list view - not displayed and adds payload

      const response = await fetch(`/api/tasks?${params.toString()}`)
      const data = await response.json()
      setTasks(data.tasks || [])
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
  }, [statusFilter, projectFilter, priorityFilter])

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/tasks/projects?status=active&includeTaskCount=true')
      const data = await response.json()
      if (Array.isArray(data)) {
        setProjects(data)
      } else {
        console.error('Projects API returned non-array:', data)
        setProjects([])
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
      setProjects([])
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([loadTasks(), loadProjects()])
      setLoading(false)
    }
    load()
  }, [loadTasks])

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickAddTitle.trim()) return

    const tempId = `temp-${Date.now()}`
    const newTaskTitle = quickAddTitle.trim()
    const assignedProjectId = projectFilter && projectFilter !== 'null' ? projectFilter : null
    const assignedProject = assignedProjectId ? projects.find(p => p.id === assignedProjectId) : null

    // Optimistic update - add task immediately
    const optimisticTask: Task = {
      id: tempId,
      title: newTaskTitle,
      description: null,
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      scheduledDate: null,
      completedAt: null,
      isFocusTask: false,
      focusReason: null,
      focusPriority: null,
      isStarred: false,
      starredAt: null,
      createdAt: new Date().toISOString(),
      project: assignedProject ? { id: assignedProject.id, name: assignedProject.name, color: assignedProject.color } : null,
      goal: null,
      tags: [],
      links: [],
    }

    setTasks(prev => [optimisticTask, ...prev])
    setQuickAddTitle('')

    // Update stats optimistically
    if (stats) {
      setStats(prev => prev ? {
        ...prev,
        byStatus: {
          ...prev.byStatus,
          todo: (prev.byStatus.todo || 0) + 1,
        },
        total: prev.total + 1,
      } : null)
    }

    setAddingTask(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          projectId: assignedProjectId,
        }),
      })

      if (response.ok) {
        const createdTask = await response.json()
        // Replace temp task with real task
        setTasks(prev => prev.map(t => t.id === tempId ? { ...createdTask, tags: createdTask.tags || [], links: createdTask.links || [] } : t))
        // Update project counts in background (lightweight)
        loadProjects()
      } else {
        // Revert on error
        setTasks(prev => prev.filter(t => t.id !== tempId))
        if (stats) {
          setStats(prev => prev ? {
            ...prev,
            byStatus: { ...prev.byStatus, todo: (prev.byStatus.todo || 1) - 1 },
            total: prev.total - 1,
          } : null)
        }
      }
    } catch (error) {
      console.error('Failed to create task:', error)
      // Revert on error
      setTasks(prev => prev.filter(t => t.id !== tempId))
    } finally {
      setAddingTask(false)
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic update - update UI immediately
    const previousTasks = tasks
    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, status: newStatus, completedAt: newStatus === 'done' ? new Date().toISOString() : null }
        : task
    ))

    // Update stats optimistically
    if (stats) {
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        const oldStatus = task.status
        setStats(prev => prev ? {
          ...prev,
          byStatus: {
            ...prev.byStatus,
            [oldStatus]: (prev.byStatus[oldStatus] || 1) - 1,
            [newStatus]: (prev.byStatus[newStatus] || 0) + 1,
          }
        } : null)
      }
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        // Revert on error
        setTasks(previousTasks)
        console.error('Failed to update task')
      }
      // Don't reload - optimistic update is sufficient
    } catch (error) {
      // Revert on error
      setTasks(previousTasks)
      console.error('Failed to update task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    // Optimistic update
    const previousTasks = tasks
    const deletedTask = tasks.find(t => t.id === taskId)
    setTasks(prev => prev.filter(task => task.id !== taskId))

    // Update stats optimistically
    if (stats && deletedTask) {
      setStats(prev => prev ? {
        ...prev,
        byStatus: {
          ...prev.byStatus,
          [deletedTask.status]: (prev.byStatus[deletedTask.status] || 1) - 1,
        },
        total: prev.total - 1,
      } : null)
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        // Revert on error
        setTasks(previousTasks)
      } else {
        // Only reload projects to update counts (lightweight)
        loadProjects()
      }
    } catch (error) {
      // Revert on error
      setTasks(previousTasks)
      console.error('Failed to delete task:', error)
    }
  }

  const handleStarToggle = async (taskId: string, currentlyStarred: boolean) => {
    // Optimistic update
    const previousTasks = tasks
    const newStarredState = !currentlyStarred
    setTasks(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, isStarred: newStarredState, starredAt: newStarredState ? new Date().toISOString() : null }
        : task
    ))

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: newStarredState }),
      })

      if (!response.ok) {
        // Revert on error
        setTasks(previousTasks)
        console.error('Failed to update task star status')
      }
    } catch (error) {
      // Revert on error
      setTasks(previousTasks)
      console.error('Failed to toggle star:', error)
    }
  }

  // Filter tasks by search query
  const filteredTasks = tasks.filter(task =>
    searchQuery === '' ||
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group tasks by status for board view
  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    done: filteredTasks.filter(t => t.status === 'done'),
  }

  // Header figures — N open · N done today
  const openCount = (stats?.byStatus?.todo || 0) + (stats?.byStatus?.in_progress || 0)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const doneTodayCount = tasks.filter(
    t => t.status === 'done' && t.completedAt && new Date(t.completedAt) >= todayStart
  ).length

  const viewTitle =
    projectFilter === null
      ? 'All tasks'
      : projectFilter === 'null'
        ? 'Inbox'
        : projectFilter === 'starred'
          ? 'Starred'
          : projects.find(p => p.id === projectFilter)?.name || 'Tasks'

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)]">
      {/* Projects rail (hidden on mobile by default) */}
      {showProjectSidebar && (
        <div className="hidden w-[218px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-border px-3.5 py-6 md:flex">
          {/* Rail header */}
          <div className="flex items-center px-2">
            <h2 className="flex-1 font-display text-base font-bold tracking-[-0.3px] text-foreground">
              Projects
            </h2>
            <button
              onClick={() => setShowProjectForm(true)}
              title="Create new project"
              className="grid size-7 place-items-center rounded-[8px] text-gold-600 transition-colors hover:bg-gold-600/10 dark:text-gold-400 dark:hover:bg-gold-400/12"
            >
              <Plus className="size-[15px]" />
            </button>
          </div>

          {/* Pinned rows */}
          <div className="flex flex-col gap-px">
            <Link href="/dashboard" className={projectRowClass(false)}>
              <Target className="size-3.5 shrink-0" />
              <span className="flex-1 truncate text-left">Today&apos;s Focus</span>
              <ArrowUpRight className="size-3 shrink-0" />
            </Link>

            <button
              onClick={() => setProjectFilter('starred')}
              className={projectRowClass(projectFilter === 'starred')}
            >
              <Star className="size-3.5 shrink-0" />
              <span className="flex-1 truncate text-left">Starred</span>
              <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
                {tasks.filter(t => t.isStarred && statusFilter.includes(t.status)).length}
              </span>
            </button>

            <button
              onClick={() => setProjectFilter(null)}
              className={projectRowClass(projectFilter === null)}
            >
              <LayoutList className="size-3.5 shrink-0" />
              <span className="flex-1 truncate text-left">All tasks</span>
              <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
                {stats?.byStatus?.todo || 0}
              </span>
            </button>
          </div>

          {/* Project list */}
          <div>
            <div className="kicker px-2 pb-2 text-muted-foreground">By project</div>
            <div className="flex flex-col gap-px">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setProjectFilter(project.id)}
                  className={projectRowClass(projectFilter === project.id)}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="flex-1 truncate text-left">{project.name}</span>
                  <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
                    {project.openTaskCount || 0}
                  </span>
                </button>
              ))}

              {/* No Project */}
              <button
                onClick={() => setProjectFilter('null')}
                className={projectRowClass(projectFilter === 'null')}
              >
                <span className="size-2 shrink-0 rounded-full border border-dashed border-muted-foreground" />
                <span className="flex-1 truncate text-left">No project</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-4 pt-5 md:px-7 md:pt-6">
          <div className="flex items-start gap-2">
            {!showProjectSidebar && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowProjectSidebar(true)}
                className="mt-1 hidden md:flex"
              >
                <FolderKanban className="size-4" />
              </Button>
            )}
            <PageHeader
              className="mb-4 flex-1"
              kicker="TODAY · TASKS"
              title={viewTitle}
              subtitle={
                <>
                  <span className="font-mono tabular-nums">{openCount}</span> open ·{' '}
                  <span className="font-mono tabular-nums">{doneTodayCount}</span> done today
                  {(stats?.overdue || 0) > 0 && (
                    <span className="text-coral-600 dark:text-coral-300">
                      {' '}· <span className="font-mono tabular-nums">{stats?.overdue}</span> overdue
                    </span>
                  )}
                </>
              }
              actions={
                <>
                  {/* List / Board / Calendar segmented control */}
                  <div className="hidden items-center overflow-hidden rounded-[9px] border border-border md:flex">
                    {VIEW_OPTIONS.map((opt, i) => {
                      const Icon = opt.icon
                      return (
                        <button
                          key={opt.mode}
                          onClick={() => setViewMode(opt.mode)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-[7px] text-[12.5px] transition-colors',
                            i < VIEW_OPTIONS.length - 1 && 'border-r border-border',
                            viewMode === opt.mode
                              ? 'bg-secondary font-semibold text-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Icon className="size-3.5" />
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* New Task Button - Icon only on mobile */}
                  <Button onClick={() => setShowTaskForm(true)} variant="gold" size="sm">
                    <Plus className="size-4" />
                    <span className="hidden sm:inline">New task</span>
                  </Button>
                </>
              }
            />
          </div>

          {/* Mobile: Project Filter Dropdown */}
          <div className="mb-3 md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    {projectFilter === 'starred' ? (
                      <Star className="size-4 text-gold-600 dark:text-gold-400" />
                    ) : (
                      <FolderKanban className="size-4" />
                    )}
                    {projectFilter === null
                      ? 'All tasks'
                      : projectFilter === 'null'
                        ? 'No project'
                        : projectFilter === 'starred'
                          ? 'Starred'
                          : projects.find(p => p.id === projectFilter)?.name || 'Project'}
                  </span>
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => setProjectFilter('starred')}>
                  <Star
                    className={cn(
                      'mr-2 size-4',
                      projectFilter === 'starred' && 'fill-current text-gold-600 dark:text-gold-400'
                    )}
                  />
                  Starred
                  {projectFilter === 'starred' && <CheckCircle2 className="ml-auto size-3 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProjectFilter(null)}>
                  <LayoutList className="mr-2 size-4" />
                  All tasks
                  {projectFilter === null && <CheckCircle2 className="ml-auto size-3 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {projects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    onClick={() => setProjectFilter(project.id)}
                  >
                    <span
                      className="mr-2 size-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                    <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                      {project.openTaskCount || 0}
                    </span>
                    {projectFilter === project.id && <CheckCircle2 className="ml-2 size-3 text-primary" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProjectFilter('null')}>
                  <span className="mr-2 size-3 rounded-full border border-dashed border-muted-foreground" />
                  No project
                  {projectFilter === 'null' && <CheckCircle2 className="ml-auto size-3 text-primary" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search + quick-add + filters row */}
          <div className="flex flex-col gap-2 pb-4 md:flex-row md:items-center md:gap-2.5">
            {/* Search - Full width on mobile */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Quick Add — dashed row, type and hit return (hidden on mobile) */}
            <form onSubmit={handleQuickAdd} className="hidden flex-1 items-center gap-2 md:flex">
              <div className="relative flex-1">
                <Plus className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gold-600 dark:text-gold-400" />
                <Input
                  placeholder="Quick add — type and hit return"
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  className="border-dashed pl-9"
                  disabled={addingTask}
                />
              </div>
              {quickAddTitle && (
                <Button type="submit" size="sm" variant="outline" disabled={addingTask}>
                  {addingTask ? <Loader2 className="size-4 animate-spin" /> : 'Add'}
                </Button>
              )}
            </form>

            {/* Filter buttons row - horizontal scroll on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
                    <Filter className="size-4" />
                    <span className="hidden sm:inline">Status</span>
                    {statusFilter.length > 0 && statusFilter.length < 4 && (
                      <Badge variant="default" className="ml-1 h-5 px-1.5 font-mono tabular-nums">
                        {statusFilter.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {['todo', 'in_progress', 'done', 'cancelled'].map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => {
                        setStatusFilter((prev) =>
                          prev.includes(status)
                            ? prev.filter((s) => s !== status)
                            : [...prev, status]
                        )
                      }}
                    >
                      <span className={cn(
                        'flex items-center gap-2',
                        statusFilter.includes(status) && 'font-medium'
                      )}>
                        {STATUS_ICONS[status]}
                        {status.replace('_', ' ')}
                        {statusFilter.includes(status) && <CheckCircle2 className="ml-auto size-3 text-primary" />}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Priority Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
                    <span className="hidden sm:inline">Priority</span>
                    <span className="sm:hidden">Pri</span>
                    {priorityFilter && (
                      <Badge variant="neutral" className="ml-1 h-5 px-1.5 capitalize">
                        {priorityFilter}
                      </Badge>
                    )}
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setPriorityFilter(null)}>
                    All priorities
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {['urgent', 'high', 'medium', 'low'].map((priority) => (
                    <DropdownMenuItem
                      key={priority}
                      onClick={() => setPriorityFilter(priority)}
                    >
                      <span className="flex items-center gap-2 capitalize">
                        <span className={cn('size-2 rounded-full', PRIORITY_DOT_COLORS[priority])} />
                        {priority}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto px-4 pb-8 md:px-7">
          {/* Goals Section - shown only when not filtering by project */}
          {(projectFilter === null || projectFilter === 'starred') && (
            <GoalsSection className="mb-4" />
          )}

          {viewMode === 'list' && (
            <div>
              {filteredTasks.length === 0 ? (
                <div className="rounded-[14px] border border-border bg-card shadow-soft dark:shadow-none">
                  <EmptyState
                    icon={CheckSquare}
                    title={
                      searchQuery
                        ? 'Nothing matches that search'
                        : statusFilter.length === 0
                          ? 'Pick a status to see your tasks'
                          : 'All clear — nothing on the list'
                    }
                    description={
                      searchQuery
                        ? 'Try a different word, or clear the search to see everything.'
                        : statusFilter.length === 0
                          ? 'Choose at least one status filter above and your tasks will show up here.'
                          : 'Add the next thing on your mind and it will land right here.'
                    }
                    action={
                      <Button onClick={() => setShowTaskForm(true)} variant="outline">
                        <Plus className="size-4" />
                        New task
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {groupTasksByDue(filteredTasks).map((group) => (
                    <div key={group.key} className="flex flex-col gap-2">
                      {/* Group divider — mono uppercase kicker (Today = gold) */}
                      <div className="flex items-center gap-2 px-0.5">
                        <span
                          className={cn(
                            'font-mono text-[11px] uppercase tracking-[1.6px]',
                            group.gold
                              ? 'text-gold-600 dark:text-gold-400'
                              : 'text-muted-foreground'
                          )}
                        >
                          {group.label}
                        </span>
                        <span className="h-px flex-1 bg-border" />
                      </div>

                      {group.tasks.map((task) => (
                        <TaskListRow
                          key={task.id}
                          task={task}
                          onSelect={setSelectedTask}
                          onStarToggle={handleStarToggle}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDeleteTask}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'board' && (
            <div className="grid grid-cols-1 gap-4 md:h-full md:grid-cols-3">
              {([
                ['todo', 'To do'],
                ['in_progress', 'In progress'],
                ['done', 'Done'],
              ] as const).map(([statusKey, label]) => (
                <div
                  key={statusKey}
                  className="flex flex-col rounded-[14px] border border-border bg-card shadow-soft dark:shadow-none"
                >
                  <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    {STATUS_ICONS[statusKey]}
                    <span className="font-mono text-[11px] uppercase tracking-[1.6px] text-muted-foreground">
                      {label}
                    </span>
                    <Badge variant="default" className="ml-1 font-mono tabular-nums">
                      {tasksByStatus[statusKey].length}
                    </Badge>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto p-3 md:max-h-none md:flex-1">
                    {tasksByStatus[statusKey].length === 0 ? (
                      <div className="rounded-[12px] border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
                        Nothing here yet
                      </div>
                    ) : (
                      tasksByStatus[statusKey].map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onStatusChange={handleStatusChange}
                          onStarToggle={handleStarToggle}
                          onEdit={() => setSelectedTask(task)}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'calendar' && (
            <div className="rounded-[14px] border border-border bg-card shadow-soft dark:shadow-none">
              <EmptyState
                icon={CalendarDays}
                title="Calendar view is on the way"
                description="Until it lands, the list view keeps everything sorted by due date."
              />
            </div>
          )}
        </div>
      </div>

      {/* Task Form Modal - for creating new tasks */}
      {showTaskForm && (
        <TaskForm
          task={editingTask}
          projects={projects}
          onClose={() => {
            setShowTaskForm(false)
            setEditingTask(null)
          }}
          onSave={async (savedTask?: Task) => {
            // Optimistic update - update local state immediately
            if (savedTask) {
              if (editingTask) {
                // Update existing task
                setTasks(prev => prev.map(t => t.id === savedTask.id ? savedTask : t))
              } else {
                // Add new task at the top
                setTasks(prev => [savedTask, ...prev])
                // Update stats
                if (stats) {
                  setStats(prev => prev ? {
                    ...prev,
                    byStatus: {
                      ...prev.byStatus,
                      [savedTask.status]: (prev.byStatus[savedTask.status] || 0) + 1,
                    },
                    total: prev.total + 1,
                  } : null)
                }
              }
              // Update project counts in background
              loadProjects()
            }
            setShowTaskForm(false)
            setEditingTask(null)
          }}
        />
      )}

      {/* Task Detail Slide-in Panel - for viewing/editing existing tasks */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          projects={projects}
          onClose={() => setSelectedTask(null)}
          onSave={async (savedTask?: Task) => {
            if (savedTask) {
              setTasks(prev => prev.map(t => t.id === savedTask.id ? savedTask : t))
              loadProjects()
            }
            setSelectedTask(null)
          }}
          onDelete={async (taskId: string) => {
            await handleDeleteTask(taskId)
            setSelectedTask(null)
          }}
        />
      )}

      {/* Project Form Modal */}
      {showProjectForm && (
        <ProjectForm
          project={editingProject}
          onClose={() => {
            setShowProjectForm(false)
            setEditingProject(null)
          }}
          onSave={(savedProject) => {
            // Optimistic update - update local state immediately
            if (savedProject) {
              if (editingProject) {
                // Update existing project
                setProjects(prev => prev.map(p => p.id === savedProject.id ? { ...savedProject, openTaskCount: p.openTaskCount, taskCount: p.taskCount } : p))
              } else {
                // Add new project
                setProjects(prev => [...prev, { ...savedProject, openTaskCount: 0, taskCount: 0 }])
              }
            }
            setShowProjectForm(false)
            setEditingProject(null)
          }}
        />
      )}
    </div>
  )
}

// Task row — list view (per USTaskRow: focus star · check circle · 3px
// priority bar · title + chips · project dot + tag · mono due date · kebab)
function TaskListRow({
  task,
  onSelect,
  onStarToggle,
  onStatusChange,
  onDelete,
}: {
  task: Task
  onSelect: (task: Task) => void
  onStarToggle: (id: string, isStarred: boolean) => void
  onStatusChange: (id: string, status: string) => void
  onDelete: (id: string) => void
}) {
  const due = formatDueDate(task.dueDate)
  const overdue = isOverdue(task.dueDate) && task.status !== 'done'

  return (
    <div
      onClick={() => onSelect(task)}
      className={cn(
        'group flex cursor-pointer items-center gap-3 rounded-[12px] border border-border bg-card px-3 py-3 transition-colors hover:border-cream-500 dark:hover:border-ink-600 md:gap-3.5 md:px-[18px]',
        task.status === 'done' && 'opacity-60'
      )}
    >
      {/* Focus star */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onStarToggle(task.id, task.isStarred)
        }}
        className={cn(
          '-m-1 shrink-0 p-1 transition-all hover:scale-110',
          task.isStarred
            ? 'text-gold-600 dark:text-gold-400'
            : 'text-muted-foreground/45 hover:text-gold-600 dark:hover:text-gold-400'
        )}
        title={task.isStarred ? 'Unstar task' : 'Star task'}
      >
        <Star className={cn('size-3.5', task.isStarred && 'fill-current')} />
      </button>

      {/* Check circle */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onStatusChange(task.id, task.status === 'done' ? 'todo' : 'done')
        }}
        className={cn(
          'grid size-[19px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors',
          task.status === 'done'
            ? 'border-green-600 bg-green-600/12 dark:border-green-300 dark:bg-green-300/12'
            : task.status === 'in_progress'
              ? 'border-teal-600 dark:border-teal-300'
              : 'border-muted-foreground/60 hover:border-green-600 dark:hover:border-green-300'
        )}
        title={task.status === 'done' ? 'Mark as to do' : 'Mark as done'}
      >
        {task.status === 'done' && (
          <Check className="size-2.5 text-green-600 dark:text-green-300" strokeWidth={3} />
        )}
      </button>

      {/* 3px priority bar */}
      <span
        className={cn(
          'w-[3px] self-stretch rounded-[2px]',
          PRIORITY_BAR_COLORS[task.priority] || PRIORITY_BAR_COLORS.low
        )}
      />

      {/* Task content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'text-sm font-semibold text-foreground',
              task.status === 'done' && 'text-muted-foreground line-through'
            )}
          >
            {task.title}
          </span>
          {task.isFocusTask && (
            <Badge variant="gold">
              <Sparkles className="size-2.5" />
              <span className="hidden sm:inline">Focus</span>
            </Badge>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {/* Project dot + name */}
          {task.project && (
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <span
                className="inline-block size-[7px] rounded-full"
                style={{ backgroundColor: task.project.color }}
              />
              <span className="hidden sm:inline">{task.project.name}</span>
            </span>
          )}

          {/* Tag chips */}
          {task.tags.slice(0, 2).map(({ tag }) => (
            <span
              key={tag.id}
              className="rounded-[6px] border border-border bg-secondary px-[7px] py-px text-[11px] text-muted-foreground"
            >
              {tag.name}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="text-[11px] text-muted-foreground">+{task.tags.length - 2}</span>
          )}
        </div>
      </div>

      {/* Due date — mono, Today = gold, overdue = coral */}
      {due && (
        <span
          className={cn(
            'shrink-0 font-mono text-[11.5px] tabular-nums',
            overdue
              ? 'text-coral-600 dark:text-coral-300'
              : due === 'Today' && task.status !== 'done'
                ? 'text-gold-600 dark:text-gold-400'
                : 'text-muted-foreground'
          )}
        >
          {due}
        </span>
      )}

      {/* Kebab - always visible on mobile for touch access */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onStarToggle(task.id, task.isStarred)}>
            <Star
              className={cn(
                'mr-2 size-4',
                task.isStarred && 'fill-current text-gold-600 dark:text-gold-400'
              )}
            />
            {task.isStarred ? 'Unstar' : 'Star'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSelect(task)}>
            <Pencil className="mr-2 size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onStatusChange(task.id, 'todo')}>
            {STATUS_ICONS.todo}
            <span className="ml-2">To Do</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange(task.id, 'in_progress')}>
            {STATUS_ICONS.in_progress}
            <span className="ml-2">In Progress</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange(task.id, 'done')}>
            {STATUS_ICONS.done}
            <span className="ml-2">Done</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onDelete(task.id)}>
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// Task Card Component for Board View
function TaskCard({
  task,
  onStatusChange,
  onStarToggle,
  onEdit
}: {
  task: Task
  onStatusChange: (id: string, status: string) => void
  onStarToggle: (id: string, isStarred: boolean) => void
  onEdit: () => void
}) {
  const overdue = isOverdue(task.dueDate) && task.status !== 'done'

  return (
    <div
      className={cn(
        'group cursor-pointer rounded-[12px] border border-border bg-background p-3 transition-colors hover:bg-secondary/50',
        task.isStarred &&
          'border-gold-600/30 bg-gold-600/10 dark:border-gold-400/25 dark:bg-gold-400/12'
      )}
      onClick={onEdit}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStarToggle(task.id, task.isStarred)
          }}
          className={cn(
            'mt-0.5 shrink-0 transition-colors',
            task.isStarred
              ? 'text-gold-600 dark:text-gold-400'
              : 'text-muted-foreground/45 hover:text-gold-600 dark:hover:text-gold-400'
          )}
        >
          <Star className={cn('size-3.5', task.isStarred && 'fill-current')} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStatusChange(task.id, task.status === 'done' ? 'todo' : 'done')
          }}
          className="mt-0.5 shrink-0"
        >
          {STATUS_ICONS[task.status]}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-sm font-medium text-foreground',
              task.status === 'done' && 'text-muted-foreground line-through'
            )}
          >
            {task.title}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {/* Priority */}
            <span className={cn('size-2 rounded-full', PRIORITY_DOT_COLORS[task.priority])} />

            {/* Project */}
            {task.project && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: task.project.color }}
                />
                {task.project.name}
              </span>
            )}

            {/* Due Date */}
            {task.dueDate && (
              <span
                className={cn(
                  'font-mono text-[11px] tabular-nums',
                  overdue ? 'text-coral-600 dark:text-coral-300' : 'text-muted-foreground'
                )}
              >
                {formatDueDate(task.dueDate)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
