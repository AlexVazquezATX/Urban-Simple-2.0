'use client'

import { useState, useEffect } from 'react'
import { Check, Plus, MoreHorizontal, Pencil, Trash2, Link2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { GoalForm } from './goal-form'

interface Goal {
  id: string
  title: string
  description: string | null
  period: string
  periodStart: string
  periodEnd: string
  status: string
  progress: number
  color: string
  parentId: string | null
  taskCount?: number
  completedTaskCount?: number
  parent?: {
    id: string
    title: string
  } | null
  children?: Goal[]
}

interface GoalsSectionProps {
  onGoalClick?: (goalId: string) => void
  className?: string
}

// Helper functions for date ranges
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekEnd(date: Date = new Date()): Date {
  const start = getWeekStart(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

function getMonthStart(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function getMonthEnd(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + 1)
  d.setDate(0)
  d.setHours(23, 59, 59, 999)
  return d
}

function isGoalDone(goal: Goal) {
  return goal.status === 'completed' || goal.progress >= 100
}

export function GoalsSection({ onGoalClick, className }: GoalsSectionProps) {
  const [weeklyGoals, setWeeklyGoals] = useState<Goal[]>([])
  const [monthlyGoals, setMonthlyGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [defaultPeriod, setDefaultPeriod] = useState<'weekly' | 'monthly'>('weekly')

  const weekStart = getWeekStart()
  const weekEnd = getWeekEnd()
  const monthStart = getMonthStart()
  const monthEnd = getMonthEnd()

  const loadGoals = async () => {
    try {
      const response = await fetch('/api/goals/current')
      const data = await response.json()
      setWeeklyGoals(data.weekly || [])
      setMonthlyGoals(data.monthly || [])
    } catch (error) {
      console.error('Failed to load goals:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGoals()
  }, [])

  const handleAddGoal = (period: 'weekly' | 'monthly') => {
    setDefaultPeriod(period)
    setEditingGoal(null)
    setShowGoalForm(true)
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setDefaultPeriod(goal.period as 'weekly' | 'monthly')
    setShowGoalForm(true)
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setWeeklyGoals(prev => prev.filter(g => g.id !== goalId))
        setMonthlyGoals(prev => prev.filter(g => g.id !== goalId))
      }
    } catch (error) {
      console.error('Failed to delete goal:', error)
    }
  }

  const handleGoalSaved = (savedGoal?: Goal) => {
    if (savedGoal) {
      if (savedGoal.period === 'weekly') {
        if (editingGoal) {
          setWeeklyGoals(prev => prev.map(g => g.id === savedGoal.id ? savedGoal : g))
        } else {
          setWeeklyGoals(prev => [...prev, savedGoal])
        }
      } else {
        if (editingGoal) {
          setMonthlyGoals(prev => prev.map(g => g.id === savedGoal.id ? savedGoal : g))
        } else {
          setMonthlyGoals(prev => [...prev, savedGoal])
        }
      }
    }
    setShowGoalForm(false)
    setEditingGoal(null)
  }

  const formatWeekRange = () => {
    const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${startStr} – ${endStr}`
  }

  const formatMonthRange = () => {
    return monthStart.toLocaleDateString('en-US', { month: 'long' })
  }

  const weeklyDone = weeklyGoals.filter(isGoalDone).length

  if (loading) {
    return (
      <div className={cn('rounded-[14px] border border-border bg-card p-[18px] shadow-soft dark:shadow-none', className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-40 rounded-md bg-secondary" />
          <div className="flex gap-2">
            <div className="h-9 w-40 rounded-full bg-secondary" />
            <div className="h-9 w-32 rounded-full bg-secondary" />
            <div className="h-9 w-44 rounded-full bg-secondary" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={cn('rounded-[14px] border border-border bg-card p-[18px] shadow-soft dark:shadow-none', className)}>
        {/* Header — title · mono week range · gold progress bar + mono count · add */}
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <span className="font-display text-base font-bold tracking-[-0.3px] text-foreground">
            This week&apos;s goals
          </span>
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            {formatWeekRange()}
          </span>
          <span className="flex-1" />
          {weeklyGoals.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-[5px] w-[90px] overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${(weeklyDone / weeklyGoals.length) * 100}%` }}
                />
              </div>
              <span className="font-mono text-[11.5px] tabular-nums text-gold-600 dark:text-gold-400">
                {weeklyDone}/{weeklyGoals.length}
              </span>
            </div>
          )}
          <button
            onClick={() => handleAddGoal('weekly')}
            disabled={weeklyGoals.length >= 5}
            title={weeklyGoals.length >= 5 ? 'Five goals is plenty for one week' : 'Add a weekly goal'}
            className="grid size-7 place-items-center rounded-[8px] text-gold-600 transition-colors hover:bg-gold-600/10 disabled:opacity-40 dark:text-gold-400 dark:hover:bg-gold-400/12"
          >
            <Plus className="size-[15px]" />
          </button>
        </div>

        {/* Weekly goal chips */}
        <div className="flex flex-wrap gap-2">
          {weeklyGoals.length === 0 ? (
            <button
              onClick={() => handleAddGoal('weekly')}
              className="w-full rounded-[12px] border border-dashed border-border px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-gold-600/30 hover:text-gold-600 dark:hover:border-gold-400/25 dark:hover:text-gold-400"
            >
              + Set your first goal for the week
            </button>
          ) : (
            weeklyGoals.map((goal) => (
              <GoalChip
                key={goal.id}
                goal={goal}
                onEdit={() => handleEditGoal(goal)}
                onDelete={() => handleDeleteGoal(goal.id)}
                onClick={onGoalClick ? () => onGoalClick(goal.id) : undefined}
              />
            ))
          )}
        </div>

        {/* Monthly goals */}
        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="kicker text-muted-foreground">{formatMonthRange()} goals</span>
            <span className="flex-1" />
            <button
              onClick={() => handleAddGoal('monthly')}
              title="Add a monthly goal"
              className="grid size-6 place-items-center rounded-[8px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {monthlyGoals.length === 0 ? (
              <button
                onClick={() => handleAddGoal('monthly')}
                className="rounded-full border border-dashed border-border px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-gold-600/30 hover:text-gold-600 dark:hover:border-gold-400/25 dark:hover:text-gold-400"
              >
                + Add a monthly goal
              </button>
            ) : (
              monthlyGoals.map((goal) => (
                <GoalChip
                  key={goal.id}
                  goal={goal}
                  onEdit={() => handleEditGoal(goal)}
                  onDelete={() => handleDeleteGoal(goal.id)}
                  onClick={onGoalClick ? () => onGoalClick(goal.id) : undefined}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Goal Form Modal */}
      {showGoalForm && (
        <GoalForm
          goal={editingGoal}
          monthlyGoals={monthlyGoals}
          defaultPeriod={defaultPeriod}
          weekStart={weekStart}
          weekEnd={weekEnd}
          monthStart={monthStart}
          monthEnd={monthEnd}
          onClose={() => {
            setShowGoalForm(false)
            setEditingGoal(null)
          }}
          onSave={handleGoalSaved}
        />
      )}
    </>
  )
}

// Goal pill-chip — check circle + title; done = green dim treatment.
// Edit/Delete live behind the chip's kebab menu (never inline red).
function GoalChip({
  goal,
  onEdit,
  onDelete,
  onClick,
}: {
  goal: Goal
  onEdit: () => void
  onDelete: () => void
  onClick?: () => void
}) {
  const done = isGoalDone(goal)

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border py-1.5 pl-3.5 pr-1.5 text-[12.5px] font-medium transition-colors',
        done
          ? 'border-green-600/30 bg-green-600/12 text-green-600 dark:border-green-300/25 dark:bg-green-300/12 dark:text-green-300'
          : 'border-border bg-secondary/60 text-foreground/80',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <span
        className={cn(
          'grid size-3.5 shrink-0 place-items-center rounded-full border-[1.5px]',
          done
            ? 'border-green-600 dark:border-green-300'
            : 'border-muted-foreground/60'
        )}
      >
        {done && <Check className="size-2 text-green-600 dark:text-green-300" strokeWidth={3} />}
      </span>

      <span className="max-w-[220px] truncate">{goal.title}</span>

      {goal.taskCount !== undefined && (
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {goal.completedTaskCount || 0}/{goal.taskCount}
        </span>
      )}

      {goal.parent && (
        <Link2
          className="size-3 shrink-0 text-muted-foreground"
          aria-label={`Supports: ${goal.parent.title}`}
        />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
            title="Goal options"
          >
            <MoreHorizontal className="size-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Pencil className="mr-2 size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
