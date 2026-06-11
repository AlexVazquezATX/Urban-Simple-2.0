'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Target, Sparkles, Loader2, Check, Star, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

interface FocusTask {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  focusReason: string | null
  focusPriority: number | null
  isStarred: boolean
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
  links: Array<{
    id: string
    entityType: string
    entityId: string
    entityLabel: string | null
  }>
}

interface GoalSummary {
  id: string
  title: string
  progress: number
  color: string
  taskCount: number
  completedTaskCount: number
}

interface TaskStats {
  byStatus: Record<string, number>
  overdue: number
  dueToday: number
  total: number
}

export function FocusWidget() {
  const [focusTasks, setFocusTasks] = useState<FocusTask[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [weeklyGoals, setWeeklyGoals] = useState<GoalSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadFocus()
    loadStats()
    loadGoals()
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

  const loadGoals = async () => {
    try {
      const response = await fetch('/api/goals/current')
      if (response.ok) {
        const data = await response.json()
        setWeeklyGoals(data.weekly || [])
      }
    } catch (error) {
      console.error('Failed to load goals:', error)
      setWeeklyGoals([])
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

  const doneCount = focusTasks.filter(task => task.status === 'done').length
  const openCount = (stats?.byStatus?.todo || 0) + (stats?.byStatus?.in_progress || 0)

  if (loading) {
    return (
      <Card className="py-5">
        <CardContent className="flex items-center justify-center px-5 py-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gap-0 py-5">
      <CardHeader className="px-5 pb-2">
        <div className="flex items-center gap-2.5">
          <Star className="size-4 shrink-0 text-gold-600 dark:text-gold-400" />
          <CardTitle>Today&apos;s focus</CardTitle>
          {focusTasks.length > 0 && (
            <Badge variant="gold">{doneCount} of {focusTasks.length}</Badge>
          )}
          <span className="flex-1" />
          {focusTasks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={generateFocus}
              disabled={generating}
              className="gap-1.5 text-[12.5px] font-semibold text-gold-600 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300"
            >
              {generating ? (
                <Loader2 className="size-[13px] animate-spin" />
              ) : (
                <Sparkles className="size-[13px]" />
              )}
              {generating ? 'Analyzing...' : 'Regenerate'}
            </Button>
          )}
        </div>
        {summary && (
          <p className="text-[12.5px] text-muted-foreground">{summary}</p>
        )}
      </CardHeader>

      <CardContent className="px-5">
        {/* This week's goals */}
        {weeklyGoals.length > 0 && (
          <div className="mb-2 rounded-[11px] border border-border/60 bg-secondary/40 px-3.5 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="kicker text-muted-foreground">This week&apos;s goals</span>
              <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
                {weeklyGoals.filter(g => g.progress >= 100).length}/{weeklyGoals.length} complete
              </span>
            </div>
            <div className="flex gap-2">
              {weeklyGoals.slice(0, 3).map(goal => (
                <div key={goal.id} className="min-w-0 flex-1" title={`${goal.title}: ${goal.progress}%`}>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 truncate text-[10px] text-muted-foreground">{goal.title}</p>
                </div>
              ))}
            </div>
            {weeklyGoals.length > 3 && (
              <p className="mt-1 text-[10px] text-muted-foreground">+{weeklyGoals.length - 3} more</p>
            )}
          </div>
        )}

        {/* Focus tasks */}
        {focusTasks.length > 0 ? (
          <div className="flex flex-col">
            {focusTasks.map(task => {
              const done = task.status === 'done'
              const overdue = isOverdue(task.dueDate) && !done
              const meta = overdue
                ? formatDueDate(task.dueDate)
                : task.project?.name || task.goal?.title || formatDueDate(task.dueDate)

              return (
                <div key={task.id} className="flex items-center gap-3 px-1 py-2.5">
                  <button
                    onClick={() => handleStatusChange(task.id, done ? 'todo' : 'done')}
                    aria-label={done ? 'Mark as to do' : 'Mark as done'}
                    className={cn(
                      'grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors',
                      done
                        ? 'border-green-600 bg-green-600/12 dark:border-green-300 dark:bg-green-300/12'
                        : 'border-muted-foreground/50 hover:border-gold-600 dark:hover:border-gold-400'
                    )}
                  >
                    {done && (
                      <Check className="size-2.5 text-green-600 dark:text-green-300" strokeWidth={2.4} />
                    )}
                  </button>
                  {task.isStarred && (
                    <Star className="size-3.5 shrink-0 fill-gold-500 text-gold-600 dark:text-gold-400" />
                  )}
                  <span
                    title={task.focusReason || undefined}
                    className={cn(
                      'min-w-0 flex-1 truncate text-[13.5px]',
                      done ? 'text-muted-foreground line-through' : 'text-foreground'
                    )}
                  >
                    {task.title}
                  </span>
                  {meta && (
                    <span
                      className={cn(
                        'shrink-0 font-mono text-[10.5px]',
                        overdue ? 'text-coral-600 dark:text-coral-300' : 'text-muted-foreground'
                      )}
                    >
                      {meta}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={Target}
            title="No focus set for today"
            description="Generate an AI-powered focus list from your open tasks and goals."
            className="py-8"
            action={
              <Button onClick={generateFocus} disabled={generating} variant="gold">
                {generating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {generating ? 'Analyzing...' : 'Generate Focus'}
              </Button>
            }
          />
        )}
      </CardContent>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-border px-5 pt-3.5">
        <Link
          href="/tasks"
          className="flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all tasks
          <ChevronRight className="size-3.5" />
        </Link>
        {stats && (
          <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
            {stats.overdue > 0 && (
              <span className="text-coral-600 dark:text-coral-300">{stats.overdue} overdue · </span>
            )}
            {stats.dueToday > 0 && (
              <span className="text-gold-600 dark:text-gold-400">{stats.dueToday} due today · </span>
            )}
            {openCount} open
          </span>
        )}
      </div>
    </Card>
  )
}
