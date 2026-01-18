'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Target,
  Sparkles,
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Calendar,
  RefreshCw,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FocusTask {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  focusReason: string | null
  focusPriority: number | null
  project: {
    id: string
    name: string
    color: string
  } | null
  links: Array<{
    id: string
    entityType: string
    entityId: string
    entityLabel: string | null
  }>
}

interface TaskStats {
  byStatus: Record<string, number>
  overdue: number
  dueToday: number
  total: number
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  todo: <Circle className="w-4 h-4 text-slate-400" />,
  in_progress: <Clock className="w-4 h-4 text-blue-500" />,
  done: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
}

export function FocusWidget() {
  const [focusTasks, setFocusTasks] = useState<FocusTask[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadFocus()
    loadStats()
  }, [])

  const loadFocus = async () => {
    try {
      const response = await fetch('/api/tasks/focus')
      if (response.ok) {
        const data = await response.json()
        // Ensure focusTasks is always an array
        setFocusTasks(Array.isArray(data.focusTasks) ? data.focusTasks : [])
      }
    } catch (error) {
      console.error('Failed to load focus tasks:', error)
      setFocusTasks([])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/tasks?status=todo,in_progress&limit=1')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to load task stats:', error)
      setStats(null)
    }
  }

  const generateFocus = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/tasks/focus', {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        setFocusTasks(data.focusTasks || [])
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Failed to generate focus:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      await loadFocus()
      await loadStats()
    } catch (error) {
      console.error('Failed to update task:', error)
    }
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

  const isOverdue = (date: string | null) => {
    if (!date) return false
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return d < today
  }

  if (loading) {
    return (
      <div className="bg-white border border-charcoal-100 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-ocean-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-charcoal-100 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-charcoal-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Target className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-charcoal-900">Today's Focus</h2>
            {summary && (
              <p className="text-xs text-charcoal-500 mt-0.5">{summary}</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={generateFocus}
          disabled={generating}
          className="gap-2 text-ocean-600 hover:text-ocean-700 hover:bg-ocean-50"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {generating ? 'Analyzing...' : 'Generate Focus'}
        </Button>
      </div>

      {/* Quick Stats */}
      {stats && (stats.overdue > 0 || stats.dueToday > 0) && (
        <div className="px-5 py-3 bg-charcoal-50/50 border-b border-charcoal-100 flex items-center gap-4 text-sm">
          {stats.overdue > 0 && (
            <span className="flex items-center gap-1.5 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              {stats.overdue} overdue
            </span>
          )}
          {stats.dueToday > 0 && (
            <span className="flex items-center gap-1.5 text-amber-600">
              <Calendar className="w-4 h-4" />
              {stats.dueToday} due today
            </span>
          )}
        </div>
      )}

      {/* Focus Tasks */}
      {focusTasks.length > 0 ? (
        <div className="divide-y divide-charcoal-50">
          {focusTasks.map((task, index) => (
            <div
              key={task.id}
              className={cn(
                'px-5 py-3 flex items-start gap-3 hover:bg-charcoal-50/50 transition-colors group',
                task.status === 'done' && 'opacity-60'
              )}
            >
              {/* Priority Number */}
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-ocean-400 to-ocean-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {index + 1}
              </div>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStatusChange(
                      task.id,
                      task.status === 'done' ? 'todo' : 'done'
                    )}
                    className="flex-shrink-0"
                  >
                    {STATUS_ICONS[task.status]}
                  </button>
                  <span className={cn(
                    'font-medium text-sm text-charcoal-900',
                    task.status === 'done' && 'line-through text-charcoal-500'
                  )}>
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-charcoal-500 ml-6">
                  {/* Due Date */}
                  {task.dueDate && (
                    <span className={cn(
                      'flex items-center gap-1',
                      isOverdue(task.dueDate) && task.status !== 'done' && 'text-red-600 font-medium'
                    )}>
                      {isOverdue(task.dueDate) && task.status !== 'done' && (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {formatDueDate(task.dueDate)}
                    </span>
                  )}

                  {/* Project */}
                  {task.project && (
                    <span className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: task.project.color }}
                      />
                      {task.project.name}
                    </span>
                  )}

                  {/* Linked Entity */}
                  {task.links.length > 0 && (
                    <span className="flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {task.links[0].entityLabel || task.links[0].entityType}
                    </span>
                  )}
                </div>

                {/* AI Reason */}
                {task.focusReason && (
                  <p className="mt-1.5 ml-6 text-xs text-ocean-600 italic">
                    "{task.focusReason}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ocean-100 to-bronze-100 flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6 text-ocean-600" />
          </div>
          <h3 className="font-medium text-charcoal-900 mb-1">No focus set for today</h3>
          <p className="text-sm text-charcoal-500 mb-4">
            Generate your AI-powered daily focus to get started
          </p>
          <Button onClick={generateFocus} disabled={generating}>
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Generate Focus
          </Button>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-charcoal-100 flex items-center justify-between bg-charcoal-50/50">
        <Link
          href="/tasks"
          className="text-sm text-ocean-600 hover:text-ocean-700 font-medium flex items-center gap-1"
        >
          View All Tasks
          <ChevronRight className="w-4 h-4" />
        </Link>
        {stats && (
          <span className="text-xs text-charcoal-400">
            {(stats.byStatus?.todo || 0) + (stats.byStatus?.in_progress || 0)} open tasks
          </span>
        )}
      </div>
    </div>
  )
}
