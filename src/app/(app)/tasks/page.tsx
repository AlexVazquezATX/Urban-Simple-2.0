'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  CheckSquare,
  Plus,
  Filter,
  Calendar,
  Loader2,
  ChevronDown,
  Sparkles,
  Circle,
  CheckCircle2,
  Clock,
  AlertTriangle,
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
  ChevronRight,
  ArrowUpRight,
  Star,
} from 'lucide-react'
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

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-600 bg-red-50 border-red-200',
  high: 'text-amber-700 bg-amber-50 border-amber-200',
  medium: 'text-ocean-700 bg-ocean-50 border-ocean-200',
  low: 'text-warm-500 bg-warm-50 border-warm-200',
}

const PRIORITY_DOT_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-ocean-500',
  low: 'bg-warm-400',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  todo: <Circle className="w-4 h-4 text-warm-400" />,
  in_progress: <Clock className="w-4 h-4 text-ocean-500" />,
  done: <CheckCircle2 className="w-4 h-4 text-lime-600" />,
  cancelled: <Circle className="w-4 h-4 text-warm-300 line-through" />,
}

type ViewMode = 'list' | 'board' | 'calendar'

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

  const formatDueDate = (date: string | null) => {
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

  const isOverdue = (date: string | null) => {
    if (!date) return false
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return d < today
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-warm-50">
        <Loader2 className="w-6 h-6 animate-spin text-ocean-500" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)]">
      {/* Left Sidebar - Projects (hidden on mobile by default) */}
      {showProjectSidebar && (
        <div className="hidden md:flex w-64 border-r border-warm-200 bg-warm-100 flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-warm-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-medium text-warm-900">Projects</h2>
              <button
                className="h-9 w-9 flex items-center justify-center rounded-sm text-ocean-600 hover:text-ocean-700 hover:bg-ocean-100 transition-colors"
                onClick={() => setShowProjectForm(true)}
                title="Create new project"
              >
                <span className="text-3xl font-black leading-none">+</span>
              </button>
            </div>

            {/* Focus Section */}
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-lime-700 bg-lime-100 hover:bg-lime-200 transition-colors"
            >
              <Target className="w-4 h-4" />
              <span className="flex-1 text-left font-medium">Today's Focus</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>

            {/* Starred Tasks */}
            <button
              onClick={() => setProjectFilter('starred')}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors mt-1',
                projectFilter === 'starred'
                  ? 'bg-lime-100 text-lime-700'
                  : 'text-warm-600 hover:bg-warm-200'
              )}
            >
              <Star className="w-4 h-4" />
              <span className="flex-1 text-left">Starred</span>
              <span className="text-xs text-warm-500">
                {tasks.filter(t => t.isStarred && statusFilter.includes(t.status)).length}
              </span>
            </button>

            <div className="border-t border-warm-200 my-3" />

            {/* All Tasks */}
            <button
              onClick={() => setProjectFilter(null)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors',
                projectFilter === null
                  ? 'bg-warm-200 text-warm-900'
                  : 'text-warm-600 hover:bg-warm-200'
              )}
            >
              <LayoutList className="w-4 h-4" />
              <span className="flex-1 text-left">All Tasks</span>
              <span className="text-xs text-warm-500">
                {stats?.byStatus?.todo || 0}
              </span>
            </button>
          </div>

          {/* Project List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setProjectFilter(project.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors',
                    projectFilter === project.id
                      ? 'bg-warm-200 text-warm-900'
                      : 'text-warm-600 hover:bg-warm-200'
                  )}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="flex-1 text-left truncate">{project.name}</span>
                  <span className="text-xs text-warm-500">
                    {project.openTaskCount || 0}
                  </span>
                </button>
              ))}

              {/* No Project */}
              <button
                onClick={() => setProjectFilter('null')}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors',
                  projectFilter === 'null'
                    ? 'bg-warm-200 text-warm-900'
                    : 'text-warm-600 hover:bg-warm-200'
                )}
              >
                <span className="w-3 h-3 rounded-full shrink-0 border-2 border-dashed border-warm-300" />
                <span className="flex-1 text-left">No Project</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-warm-50">
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-warm-200 bg-white">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="flex items-center gap-2 md:gap-3">
              {!showProjectSidebar && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProjectSidebar(true)}
                  className="mr-2 hidden md:flex"
                >
                  <FolderKanban className="w-4 h-4" />
                </Button>
              )}
              <div>
                <h1 className="text-lg md:text-xl font-display font-medium tracking-tight text-warm-900">
                  {projectFilter === null
                    ? 'All Tasks'
                    : projectFilter === 'null'
                      ? 'Inbox'
                      : projectFilter === 'starred'
                        ? 'Starred Tasks'
                        : projects.find(p => p.id === projectFilter)?.name || 'Tasks'}
                </h1>
                <p className="text-xs md:text-sm text-warm-500">
                  {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {/* Quick Stats - Inline in header */}
              <div className="hidden md:flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-warm-900">
                    {(stats?.byStatus?.todo || 0) + (stats?.byStatus?.in_progress || 0)}
                  </span>
                  <span className="text-warm-500">Open</span>
                </div>
                {(stats?.overdue || 0) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-red-600">
                      {stats?.overdue || 0}
                    </span>
                    <span className="text-red-500">Overdue</span>
                  </div>
                )}
              </div>

              {/* View Mode Toggle - Hidden on mobile for list, shown for board toggle */}
              <div className="hidden md:flex items-center bg-warm-100 rounded-sm p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-1.5 rounded-sm transition-colors',
                    viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-warm-200'
                  )}
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('board')}
                  className={cn(
                    'p-1.5 rounded-sm transition-colors',
                    viewMode === 'board' ? 'bg-white shadow-sm' : 'hover:bg-warm-200'
                  )}
                >
                  <Columns3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={cn(
                    'p-1.5 rounded-sm transition-colors',
                    viewMode === 'calendar' ? 'bg-white shadow-sm' : 'hover:bg-warm-200'
                  )}
                >
                  <CalendarDays className="w-4 h-4" />
                </button>
              </div>

              {/* New Task Button - Icon only on mobile */}
              <Button
                onClick={() => setShowTaskForm(true)}
                variant="lime"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Task</span>
              </Button>
            </div>
          </div>

          {/* Mobile: Project Filter Dropdown */}
          <div className="md:hidden mb-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    {projectFilter === 'starred' ? <Star className="w-4 h-4 text-lime-600" /> : <FolderKanban className="w-4 h-4" />}
                    {projectFilter === null
                      ? 'All Tasks'
                      : projectFilter === 'null'
                        ? 'No Project'
                        : projectFilter === 'starred'
                          ? 'Starred'
                          : projects.find(p => p.id === projectFilter)?.name || 'Project'}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => setProjectFilter('starred')}>
                  <Star className={cn('w-4 h-4 mr-2', projectFilter === 'starred' && 'fill-lime-500 text-lime-600')} />
                  Starred
                  {projectFilter === 'starred' && <CheckCircle2 className="w-3 h-3 ml-auto text-ocean-500" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProjectFilter(null)}>
                  <LayoutList className="w-4 h-4 mr-2" />
                  All Tasks
                  {projectFilter === null && <CheckCircle2 className="w-3 h-3 ml-auto text-ocean-500" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {projects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    onClick={() => setProjectFilter(project.id)}
                  >
                    <span
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                    <span className="ml-auto text-xs text-warm-500">{project.openTaskCount || 0}</span>
                    {projectFilter === project.id && <CheckCircle2 className="w-3 h-3 ml-2 text-ocean-500" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProjectFilter('null')}>
                  <span className="w-3 h-3 rounded-full mr-2 border-2 border-dashed border-warm-300" />
                  No Project
                  {projectFilter === 'null' && <CheckCircle2 className="w-3 h-3 ml-auto text-ocean-500" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search and Filters Row - Responsive layout */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            {/* Search - Full width on mobile */}
            <div className="relative flex-1 md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Add - Hidden on mobile (they use the bottom nav + button) */}
            <form onSubmit={handleQuickAdd} className="hidden md:flex items-center gap-2">
              <div className="relative">
                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
                <Input
                  placeholder="Quick add task..."
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  className="pl-9 w-64"
                  disabled={addingTask}
                />
              </div>
              {quickAddTitle && (
                <Button type="submit" size="sm" variant="lime" disabled={addingTask}>
                  {addingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                </Button>
              )}
            </form>

            {/* Filter buttons row - horizontal scroll on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Status</span>
                    {statusFilter.length > 0 && statusFilter.length < 4 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
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
                        {statusFilter.includes(status) && <CheckCircle2 className="w-3 h-3 ml-auto text-ocean-500" />}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Priority Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                    <span className="hidden sm:inline">Priority</span>
                    <span className="sm:hidden">Pri</span>
                    {priorityFilter && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 capitalize">
                        {priorityFilter}
                      </Badge>
                    )}
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setPriorityFilter(null)}>
                    All Priorities
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {['urgent', 'high', 'medium', 'low'].map((priority) => (
                    <DropdownMenuItem
                      key={priority}
                      onClick={() => setPriorityFilter(priority)}
                    >
                      <span className="flex items-center gap-2 capitalize">
                        <span className={cn('w-2 h-2 rounded-full', PRIORITY_DOT_COLORS[priority])} />
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
        <div className="flex-1 overflow-auto p-3 md:p-6 scrollbar-elegant">
          {/* Goals Section - shown only when not filtering by project */}
          {(projectFilter === null || projectFilter === 'starred') && (
            <GoalsSection className="mb-4" />
          )}

          {viewMode === 'list' && (
            <div>
              {filteredTasks.length === 0 ? (
                <div className="bg-white border border-warm-200 rounded-sm p-12 text-center">
                  <div className="w-16 h-16 rounded-sm bg-warm-100 flex items-center justify-center mx-auto mb-4">
                    <CheckSquare className="w-7 h-7 text-ocean-600" />
                  </div>
                  <h3 className="text-lg font-display font-medium text-warm-900 mb-2">No tasks found</h3>
                  <p className="text-warm-500 mb-6 max-w-sm mx-auto">
                    {searchQuery
                      ? 'No tasks match your search'
                      : statusFilter.length === 0
                        ? 'Create your first task to get started'
                        : 'No tasks match your current filters'}
                  </p>
                  <Button onClick={() => setShowTaskForm(true)} variant="lime">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Task
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={cn(
                        'bg-white border border-warm-200 rounded-sm px-3 md:px-4 py-3 md:py-3 flex items-start md:items-center gap-3 md:gap-4 hover:border-ocean-400 transition-colors group cursor-pointer',
                        task.status === 'done' && 'opacity-60'
                      )}
                    >
                      {/* Star Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStarToggle(task.id, task.isStarred)
                        }}
                        className={cn(
                          'shrink-0 hover:scale-110 transition-all p-1 -m-1',
                          task.isStarred ? 'text-lime-600' : 'text-warm-300 hover:text-lime-500'
                        )}
                        title={task.isStarred ? 'Unstar task' : 'Star task'}
                      >
                        <Star className={cn('w-4 h-4', task.isStarred && 'fill-current')} />
                      </button>

                      {/* Status Toggle - Larger touch target on mobile */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStatusChange(
                            task.id,
                            task.status === 'done' ? 'todo' : 'done'
                          )
                        }}
                        className="shrink-0 hover:scale-110 transition-transform p-1 -m-1"
                      >
                        {STATUS_ICONS[task.status]}
                      </button>

                      {/* Priority Indicator */}
                      <span className={cn('w-1.5 h-6 md:h-8 rounded-full shrink-0 mt-1 md:mt-0', PRIORITY_DOT_COLORS[task.priority])} />

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start md:items-center gap-2 flex-wrap">
                          <span className={cn(
                            'font-medium text-warm-900 text-sm md:text-base',
                            task.status === 'done' && 'line-through text-warm-500'
                          )}>
                            {task.title}
                          </span>
                          {task.isFocusTask && (
                            <Badge variant="secondary" className="gap-1 text-xs bg-lime-50 text-lime-700 border-lime-200">
                              <Sparkles className="w-3 h-3" />
                              <span className="hidden sm:inline">Focus</span>
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 mt-1 text-xs text-warm-500 flex-wrap">
                          {/* Project */}
                          {task.project && (
                            <span className="flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: task.project.color }}
                              />
                              <span className="hidden sm:inline">{task.project.name}</span>
                            </span>
                          )}

                          {/* Due Date */}
                          {task.dueDate && (
                            <span className={cn(
                              'flex items-center gap-1',
                              isOverdue(task.dueDate) && task.status !== 'done' && 'text-red-600 font-medium'
                            )}>
                              {isOverdue(task.dueDate) && task.status !== 'done' && (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                              <Calendar className="w-3 h-3" />
                              {formatDueDate(task.dueDate)}
                            </span>
                          )}

                          {/* Tags - Hide on mobile to save space */}
                          {task.tags.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1">
                              {task.tags.slice(0, 2).map(({ tag }) => (
                                <span
                                  key={tag.id}
                                  className="px-1.5 py-0.5 rounded-sm text-xs"
                                  style={{
                                    backgroundColor: `${tag.color}20`,
                                    color: tag.color,
                                  }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                              {task.tags.length > 2 && (
                                <span className="text-warm-400">+{task.tags.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions - Always visible on mobile for touch access */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStarToggle(task.id, task.isStarred)}>
                            <Star className={cn('w-4 h-4 mr-2', task.isStarred && 'fill-lime-500 text-lime-600')} />
                            {task.isStarred ? 'Unstar' : 'Star'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSelectedTask(task)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'todo')}>
                            {STATUS_ICONS.todo}
                            <span className="ml-2">To Do</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'in_progress')}>
                            {STATUS_ICONS.in_progress}
                            <span className="ml-2">In Progress</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'done')}>
                            {STATUS_ICONS.done}
                            <span className="ml-2">Done</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'board' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:h-full">
              {/* To Do Column */}
              <div className="bg-white border border-warm-200 rounded-sm flex flex-col">
                <div className="px-4 py-3 border-b border-warm-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {STATUS_ICONS.todo}
                    <span className="font-medium text-warm-900">To Do</span>
                    <Badge variant="secondary" className="ml-1">{tasksByStatus.todo.length}</Badge>
                  </div>
                </div>
                <div className="md:flex-1 md:overflow-y-auto p-3 space-y-2 max-h-64 md:max-h-none overflow-y-auto">
                  {tasksByStatus.todo.map((task) => (
                    <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} onStarToggle={handleStarToggle} onEdit={() => setSelectedTask(task)} />
                  ))}
                </div>
              </div>

              {/* In Progress Column */}
              <div className="bg-white border border-warm-200 rounded-sm flex flex-col">
                <div className="px-4 py-3 border-b border-warm-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {STATUS_ICONS.in_progress}
                    <span className="font-medium text-warm-900">In Progress</span>
                    <Badge variant="secondary" className="ml-1">{tasksByStatus.in_progress.length}</Badge>
                  </div>
                </div>
                <div className="md:flex-1 md:overflow-y-auto p-3 space-y-2 max-h-64 md:max-h-none overflow-y-auto">
                  {tasksByStatus.in_progress.map((task) => (
                    <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} onStarToggle={handleStarToggle} onEdit={() => setSelectedTask(task)} />
                  ))}
                </div>
              </div>

              {/* Done Column */}
              <div className="bg-white border border-warm-200 rounded-sm flex flex-col">
                <div className="px-4 py-3 border-b border-warm-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {STATUS_ICONS.done}
                    <span className="font-medium text-warm-900">Done</span>
                    <Badge variant="secondary" className="ml-1">{tasksByStatus.done.length}</Badge>
                  </div>
                </div>
                <div className="md:flex-1 md:overflow-y-auto p-3 space-y-2 max-h-64 md:max-h-none overflow-y-auto">
                  {tasksByStatus.done.map((task) => (
                    <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} onStarToggle={handleStarToggle} onEdit={() => setSelectedTask(task)} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'calendar' && (
            <div className="bg-white border border-warm-200 rounded-sm p-8 text-center">
              <CalendarDays className="w-12 h-12 text-warm-300 mx-auto mb-4" />
              <h3 className="text-lg font-display font-medium text-warm-900 mb-2">Calendar View</h3>
              <p className="text-warm-500">Calendar view coming soon</p>
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
  const isOverdue = (date: string | null) => {
    if (!date) return false
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return d < today
  }

  const formatDueDate = (date: string | null) => {
    if (!date) return null
    const d = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const taskDate = new Date(d)
    taskDate.setHours(0, 0, 0, 0)

    if (taskDate.getTime() === today.getTime()) return 'Today'
    if (taskDate < today) {
      const days = Math.floor((today.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24))
      return `${days}d overdue`
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div
      className={cn(
        'p-3 bg-warm-50 hover:bg-warm-100 rounded-sm border border-warm-200 cursor-pointer group transition-colors',
        task.isStarred && 'bg-lime-50/50 border-lime-200'
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
            task.isStarred ? 'text-lime-600' : 'text-warm-300 hover:text-lime-500'
          )}
        >
          <Star className={cn('w-3.5 h-3.5', task.isStarred && 'fill-current')} />
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
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium text-warm-900',
            task.status === 'done' && 'line-through text-warm-500'
          )}>
            {task.title}
          </p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Priority */}
            <span className={cn('w-2 h-2 rounded-full', PRIORITY_DOT_COLORS[task.priority])} />

            {/* Project */}
            {task.project && (
              <span className="text-xs text-warm-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.project.color }} />
                {task.project.name}
              </span>
            )}

            {/* Due Date */}
            {task.dueDate && (
              <span className={cn(
                'text-xs flex items-center gap-1',
                isOverdue(task.dueDate) && task.status !== 'done' ? 'text-red-600' : 'text-warm-500'
              )}>
                <Calendar className="w-3 h-3" />
                {formatDueDate(task.dueDate)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
