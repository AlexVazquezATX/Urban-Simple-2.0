'use client'

import { useState, useEffect } from 'react'
import { Target, ChevronDown, ChevronRight, Plus, MoreHorizontal, Pencil, Trash2, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { GoalProgress } from './goal-progress'
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

export function GoalsSection({ onGoalClick, className }: GoalsSectionProps) {
  const [weeklyGoals, setWeeklyGoals] = useState<Goal[]>([])
  const [monthlyGoals, setMonthlyGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [weeklyExpanded, setWeeklyExpanded] = useState(true)
  const [monthlyExpanded, setMonthlyExpanded] = useState(false)
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
    return `${startStr} - ${endStr}`
  }

  const formatMonthRange = () => {
    return monthStart.toLocaleDateString('en-US', { month: 'long' })
  }

  if (loading) {
    return (
      <div className={cn('bg-white border border-charcoal-100 rounded-xl p-4', className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-charcoal-100 rounded w-32" />
          <div className="h-10 bg-charcoal-50 rounded" />
          <div className="h-10 bg-charcoal-50 rounded" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={cn('bg-white border border-charcoal-100 rounded-xl overflow-hidden', className)}>
        {/* Weekly Goals Section */}
        <div className="border-b border-charcoal-100">
          <button
            onClick={() => setWeeklyExpanded(!weeklyExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-charcoal-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {weeklyExpanded ? (
                <ChevronDown className="w-4 h-4 text-charcoal-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-charcoal-400" />
              )}
              <Target className="w-4 h-4 text-ocean-600" />
              <span className="font-medium text-charcoal-900">This Week's Goals</span>
              <span className="text-xs text-charcoal-500">({formatWeekRange()})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-charcoal-500">
                {weeklyGoals.length}/5
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={(e) => {
                  e.stopPropagation()
                  handleAddGoal('weekly')
                }}
                disabled={weeklyGoals.length >= 5}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </button>

          {weeklyExpanded && (
            <div className="px-4 pb-4 space-y-2">
              {weeklyGoals.length === 0 ? (
                <button
                  onClick={() => handleAddGoal('weekly')}
                  className="w-full p-3 border-2 border-dashed border-charcoal-200 rounded-lg text-sm text-charcoal-500 hover:border-ocean-300 hover:text-ocean-600 transition-colors"
                >
                  + Add your first goal for this week
                </button>
              ) : (
                weeklyGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={() => handleEditGoal(goal)}
                    onDelete={() => handleDeleteGoal(goal.id)}
                    onClick={() => onGoalClick?.(goal.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Monthly Goals Section */}
        <div>
          <button
            onClick={() => setMonthlyExpanded(!monthlyExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-charcoal-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {monthlyExpanded ? (
                <ChevronDown className="w-4 h-4 text-charcoal-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-charcoal-400" />
              )}
              <Target className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-charcoal-900">{formatMonthRange()} Goals</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-charcoal-500">
                {monthlyGoals.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={(e) => {
                  e.stopPropagation()
                  handleAddGoal('monthly')
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </button>

          {monthlyExpanded && (
            <div className="px-4 pb-4 space-y-2">
              {monthlyGoals.length === 0 ? (
                <button
                  onClick={() => handleAddGoal('monthly')}
                  className="w-full p-3 border-2 border-dashed border-charcoal-200 rounded-lg text-sm text-charcoal-500 hover:border-purple-300 hover:text-purple-600 transition-colors"
                >
                  + Add a monthly goal
                </button>
              ) : (
                monthlyGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={() => handleEditGoal(goal)}
                    onDelete={() => handleDeleteGoal(goal.id)}
                    onClick={() => onGoalClick?.(goal.id)}
                  />
                ))
              )}
            </div>
          )}
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

// Goal Card Component
function GoalCard({
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
  return (
    <div
      className={cn(
        'p-3 rounded-lg border border-charcoal-100 hover:border-charcoal-200 transition-colors group',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span
            className="w-3 h-3 rounded-full shrink-0 mt-1"
            style={{ backgroundColor: goal.color }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-charcoal-900 text-sm truncate">
              {goal.title}
            </p>
            {goal.taskCount !== undefined && (
              <p className="text-xs text-charcoal-500 mt-0.5">
                {goal.completedTaskCount || 0}/{goal.taskCount} tasks
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-20">
            <GoalProgress progress={goal.progress} size="sm" color={goal.color} />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Parent goal indicator */}
      {goal.parent && (
        <div className="mt-2 flex items-center gap-1 text-xs text-charcoal-400">
          <Link2 className="w-3 h-3" />
          <span>{goal.parent.title}</span>
        </div>
      )}
    </div>
  )
}
