'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ClipboardList, Check, Star, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

export interface PlateTask {
  id: string
  title: string
  status: string
  isStarred: boolean
  dueDate: string | null // ISO
  projectName: string | null
  goalTitle: string | null
}

export interface PlateGroup {
  key: 'overdue' | 'today' | 'inPlay' | 'upNext'
  label: string
  tasks: PlateTask[]
}

export interface PlateGoal {
  id: string
  title: string
  progress: number
}

const groupKicker: Record<PlateGroup['key'], string> = {
  overdue: 'text-coral-600 dark:text-coral-300',
  today: 'text-gold-600 dark:text-gold-400',
  inPlay: 'text-muted-foreground',
  upNext: 'text-muted-foreground',
}

function formatDue(date: string | null) {
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

/**
 * "On your plate" — the deterministic task module. No AI, no button:
 * overdue, due-today, starred/in-progress, and up-next tasks straight
 * from the task list, plus this week's goals. Always current on load.
 */
export function OnYourPlate({
  groups,
  weeklyGoals,
  moreCount,
  counts,
}: {
  groups: PlateGroup[]
  weeklyGoals: PlateGoal[]
  moreCount: number
  counts: { open: number; overdue: number; dueToday: number }
}) {
  const router = useRouter()
  // Locally-completed ids — lets a checked row strike through instantly
  // (and stay visible) instead of vanishing on the server refresh.
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [reverting, setReverting] = useState<Set<string>>(new Set())

  const toggleTask = async (task: PlateTask) => {
    const isChecked = checked.has(task.id)
    const nextStatus = isChecked ? 'todo' : 'done'
    setChecked(prev => {
      const next = new Set(prev)
      if (isChecked) next.delete(task.id)
      else next.add(task.id)
      return next
    })
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error('Update failed')
    } catch {
      // Revert the optimistic toggle
      setChecked(prev => {
        const next = new Set(prev)
        if (isChecked) next.add(task.id)
        else next.delete(task.id)
        return next
      })
      setReverting(prev => new Set(prev).add(task.id))
      toast.error("Couldn't update that task. Try again.")
      setTimeout(() => setReverting(prev => {
        const next = new Set(prev)
        next.delete(task.id)
        return next
      }), 300)
    }
  }

  const visibleGroups = groups.filter(g => g.tasks.length > 0)
  const hasTasks = visibleGroups.length > 0

  return (
    <Card className="gap-0 py-5">
      <CardHeader className="px-5 pb-2">
        <div className="flex items-center gap-2.5">
          <ClipboardList className="size-4 shrink-0 text-gold-600 dark:text-gold-400" />
          <CardTitle>On your plate</CardTitle>
          {counts.open > 0 && <Badge variant="neutral">{counts.open} open</Badge>}
          <span className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
          >
            <Link href="/tasks?new=true">
              <Plus className="size-[13px]" />
              Add task
            </Link>
          </Button>
        </div>
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

        {/* Task groups */}
        {hasTasks ? (
          <div className="flex flex-col gap-1">
            {visibleGroups.map(group => (
              <div key={group.key}>
                <div className="flex items-center gap-2 px-1 pt-2">
                  <span className={cn('kicker', groupKicker[group.key])}>{group.label}</span>
                  <span className="h-px flex-1 bg-border/60" />
                </div>
                {group.tasks.map(task => {
                  const done = checked.has(task.id)
                  const overdue = group.key === 'overdue' && !done
                  const meta = group.key === 'overdue' || group.key === 'today'
                    ? formatDue(task.dueDate)
                    : task.projectName || task.goalTitle || formatDue(task.dueDate)

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-center gap-3 px-1 py-2',
                        reverting.has(task.id) && 'animate-pulse'
                      )}
                    >
                      <button
                        onClick={() => toggleTask(task)}
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
                            overdue
                              ? 'text-coral-600 dark:text-coral-300'
                              : group.key === 'today' && !done
                                ? 'text-gold-600 dark:text-gold-400'
                                : 'text-muted-foreground'
                          )}
                        >
                          {meta}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
            {moreCount > 0 && (
              <Link
                href="/tasks"
                className="px-1 pt-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                +{moreCount} more on the full list →
              </Link>
            )}
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Nothing on your plate — enjoy the calm"
            description="Tasks you add show up here, sorted by what needs you first."
            className="py-8"
            action={
              <Button variant="outline" asChild>
                <Link href="/tasks?new=true">
                  <Plus className="size-4" />
                  Add a task
                </Link>
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
        <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
          {counts.overdue > 0 && (
            <span className="text-coral-600 dark:text-coral-300">{counts.overdue} overdue · </span>
          )}
          {counts.dueToday > 0 && (
            <span className="text-gold-600 dark:text-gold-400">{counts.dueToday} due today · </span>
          )}
          {counts.open} open
        </span>
      </div>
    </Card>
  )
}
