'use client'

import { useState } from 'react'
import { X, Loader2, Palette, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

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
  parent?: {
    id: string
    title: string
  } | null
}

interface GoalFormProps {
  goal?: Goal | null
  monthlyGoals?: Goal[]
  defaultPeriod?: 'weekly' | 'monthly'
  weekStart?: Date
  weekEnd?: Date
  monthStart?: Date
  monthEnd?: Date
  onClose: () => void
  onSave: (savedGoal?: Goal) => void
}

const COLOR_OPTIONS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
]

// Helper to get the start of the current week (Monday)
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Helper to get the end of the current week (Sunday)
function getWeekEnd(date: Date = new Date()): Date {
  const start = getWeekStart(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

// Helper to get the start of the current month
function getMonthStart(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

// Helper to get the end of the current month
function getMonthEnd(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + 1)
  d.setDate(0)
  d.setHours(23, 59, 59, 999)
  return d
}

export function GoalForm({
  goal,
  monthlyGoals = [],
  defaultPeriod = 'weekly',
  weekStart = getWeekStart(),
  weekEnd = getWeekEnd(),
  monthStart = getMonthStart(),
  monthEnd = getMonthEnd(),
  onClose,
  onSave,
}: GoalFormProps) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState(goal?.title || '')
  const [description, setDescription] = useState(goal?.description || '')
  const [period, setPeriod] = useState<'weekly' | 'monthly'>(
    (goal?.period as 'weekly' | 'monthly') || defaultPeriod
  )
  const [color, setColor] = useState(goal?.color || '#3B82F6')
  const [parentId, setParentId] = useState<string | null>(goal?.parentId || null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      const url = goal ? `/api/goals/${goal.id}` : '/api/goals'
      const method = goal ? 'PATCH' : 'POST'

      const periodStart = period === 'weekly' ? weekStart : monthStart
      const periodEnd = period === 'weekly' ? weekEnd : monthEnd

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          period,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          color,
          parentId: period === 'weekly' ? parentId : null, // Only weekly goals can have parents
        }),
      })

      if (response.ok) {
        const savedGoal = await response.json()
        onSave(savedGoal)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save goal')
      }
    } catch (error) {
      console.error('Failed to save goal:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateRange = (start: Date, end: Date, isPeriodWeekly: boolean) => {
    if (isPeriodWeekly) {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    }
    return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-100">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-ocean-600" />
            <h2 className="text-lg font-semibold text-charcoal-900">
              {goal ? 'Edit Goal' : 'New Goal'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-charcoal-100 transition-colors"
          >
            <X className="w-5 h-5 text-charcoal-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Period Toggle */}
          {!goal && (
            <div className="space-y-2">
              <Label>Goal Type</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPeriod('weekly')}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    period === 'weekly'
                      ? 'bg-ocean-100 text-ocean-700 border-2 border-ocean-500'
                      : 'bg-charcoal-50 text-charcoal-600 border-2 border-transparent hover:bg-charcoal-100'
                  )}
                >
                  Weekly Goal
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('monthly')}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    period === 'monthly'
                      ? 'bg-ocean-100 text-ocean-700 border-2 border-ocean-500'
                      : 'bg-charcoal-50 text-charcoal-600 border-2 border-transparent hover:bg-charcoal-100'
                  )}
                >
                  Monthly Goal
                </button>
              </div>
              <p className="text-xs text-charcoal-500">
                {period === 'weekly'
                  ? `Week of ${formatDateRange(weekStart, weekEnd, true)}`
                  : formatDateRange(monthStart, monthEnd, false)}
              </p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Goal</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={period === 'weekly' ? 'e.g., Close 2 new clients' : 'e.g., Sign 5 hospitality clients'}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Details (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why is this goal important?"
              rows={2}
            />
          </div>

          {/* Parent Goal (only for weekly goals) */}
          {period === 'weekly' && monthlyGoals.length > 0 && (
            <div className="space-y-2">
              <Label>Supports Monthly Goal (optional)</Label>
              <Select
                value={parentId || 'none'}
                onValueChange={(v) => setParentId(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a monthly goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent goal</SelectItem>
                  {monthlyGoals.map((mg) => (
                    <SelectItem key={mg.id} value={mg.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: mg.color }}
                        />
                        {mg.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Color */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Color
            </Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full transition-all',
                    color === c ? 'ring-2 ring-offset-2 ring-charcoal-400 scale-110' : 'hover:scale-105'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 bg-charcoal-50 rounded-lg">
            <p className="text-xs text-charcoal-500 mb-2">Preview</p>
            <div className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium text-charcoal-900">
                {title || 'Goal Title'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-charcoal-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : goal ? (
                'Save Changes'
              ) : (
                'Create Goal'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
