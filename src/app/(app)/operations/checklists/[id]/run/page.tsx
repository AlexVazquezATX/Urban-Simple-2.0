'use client'

// Field execution / run view for a checklist.
//
// This is what an associate opens from "Start Checklist" on their night route.
// It runs the company template for one shift+location: clock in, check off the
// items, then clock out + mark complete. It intentionally does NOT let the
// associate edit the company template — the checklist builder lives elsewhere and
// is admin-only. Item state is recorded onto the ServiceLog via the complete
// endpoint, and hours are captured via the clock endpoint.

import { useState, useEffect, useCallback, useMemo, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Loader2, Clock, CheckCircle, Camera, SearchX, LogIn, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RunItem {
  id: string
  text: string
  requiresPhoto?: boolean
  priority?: 'normal' | 'high'
}

interface RunSection {
  id: string
  name: string
  items: RunItem[]
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function ChecklistRunPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: templateId } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()

  const shiftId = searchParams.get('shiftId')
  const locationId = searchParams.get('locationId')

  const [loading, setLoading] = useState(true)
  const [templateName, setTemplateName] = useState('')
  const [sections, setSections] = useState<RunSection[]>([])
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')

  const [clockIn, setClockIn] = useState<string | null>(null)
  const [clockOut, setClockOut] = useState<string | null>(null)
  const [locationName, setLocationName] = useState('')

  const [clocking, setClocking] = useState(false)
  const [completing, setCompleting] = useState(false)

  const load = useCallback(async () => {
    if (!templateId) return
    try {
      const [tplRes, nightRes] = await Promise.all([
        fetch(`/api/checklists/${templateId}`),
        fetch('/api/my-night'),
      ])

      if (tplRes.ok) {
        const tpl = await tplRes.json()
        setTemplateName(tpl.name || 'Checklist')
        setSections(Array.isArray(tpl.sections) ? tpl.sections : [])
      }

      if (nightRes.ok) {
        const night = await nightRes.json()
        const loc = (night.locations || []).find(
          (l: any) => l.shiftId === shiftId && l.locationId === locationId
        )
        if (loc) {
          setClockIn(loc.clockIn || null)
          setClockOut(loc.clockOut || null)
          setLocationName(loc.locationName || '')
          // Restore any previously saved progress so re-opening a partially-done
          // checklist shows prior checks/notes instead of a blank slate (which,
          // on save, would overwrite the saved state and lose it).
          if (loc.checklistData && typeof loc.checklistData === 'object') {
            setChecked(loc.checklistData)
          }
          if (loc.overallNotes) setNotes(loc.overallNotes)
        }
      }
    } catch (error) {
      console.error('Failed to load checklist run view:', error)
      toast.error('Could not load this checklist. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [templateId, shiftId, locationId])

  useEffect(() => {
    load()
  }, [load])

  const allItems = useMemo(
    () => sections.flatMap(s => s.items || []),
    [sections]
  )
  const checkedCount = allItems.filter(i => checked[i.id]).length
  const totalItems = allItems.length
  const allChecked = totalItems > 0 && checkedCount === totalItems

  const handleClockIn = useCallback(async () => {
    if (!shiftId || !locationId) return
    setClocking(true)
    try {
      const res = await fetch('/api/operations/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId, locationId, action: 'in' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to clock in')
      setClockIn(data.clockIn)
      toast.success('Clocked in — your hours are now being tracked.')
    } catch (error: any) {
      toast.error(error.message || 'Failed to clock in')
    } finally {
      setClocking(false)
    }
  }, [shiftId, locationId])

  // Save the checklist state. When clockOutAfter is false this is a mid-visit
  // "save progress" that keeps the associate on the clock and the stop resumable;
  // only clockOutAfter=true ends the visit. (A partial save used to always clock
  // out, leaving a disabled, unresumable dead-end screen.)
  const saveProgress = useCallback(async (clockOutAfter: boolean) => {
    if (!shiftId || !locationId) return
    setCompleting(true)
    try {
      const res = await fetch(`/api/checklists/${templateId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId,
          locationId,
          checklistData: checked,
          overallNotes: notes,
          status: allChecked ? 'completed' : 'partial',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save checklist')

      if (clockOutAfter && clockIn && !clockOut) {
        const outRes = await fetch('/api/operations/clock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shiftId, locationId, action: 'out' }),
        })
        if (outRes.ok) {
          const outData = await outRes.json()
          setClockOut(outData.clockOut)
        }
      }

      if (clockOutAfter) {
        toast.success(allChecked ? 'Checklist complete — nice work.' : 'Saved and clocked out.')
        router.push('/command')
      } else {
        toast.success('Progress saved — you are still clocked in.')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save checklist')
    } finally {
      setCompleting(false)
    }
  }, [templateId, shiftId, locationId, checked, notes, allChecked, clockIn, clockOut, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 size-6 animate-spin" />
        Loading checklist...
      </div>
    )
  }

  if (!shiftId || !locationId) {
    return (
      <EmptyState
        icon={SearchX}
        title="Missing shift details"
        description="Open this checklist from tonight's route so we know which stop you're working."
        action={
          <Button variant="outline" onClick={() => router.push('/command')}>
            Back to tonight
          </Button>
        }
      />
    )
  }

  const onTheClock = Boolean(clockIn) && !clockOut

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="TONIGHT · CHECKLIST"
        title={locationName || templateName}
        subtitle={locationName ? templateName : undefined}
        backHref="/command"
      />

      {/* Clock + progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-full',
                  onTheClock
                    ? 'bg-teal-600/10 text-teal-600 dark:bg-teal-300/12 dark:text-teal-300'
                    : clockOut
                      ? 'bg-green-600/12 text-green-600 dark:bg-green-300/12 dark:text-green-300'
                      : 'bg-secondary text-muted-foreground'
                )}
              >
                <Clock className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {clockOut
                    ? 'Clocked out'
                    : onTheClock
                      ? 'On the clock'
                      : 'Not started'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {clockIn ? `In ${formatTime(clockIn)}` : 'Clock in to start tracking hours'}
                  {clockOut ? ` · Out ${formatTime(clockOut)}` : ''}
                </p>
              </div>
            </div>

            {!clockIn && (
              <Button
                variant="gold"
                size="sm"
                className="gap-1.5"
                onClick={handleClockIn}
                disabled={clocking}
              >
                {clocking ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <LogIn className="size-3.5" />
                )}
                Clock in
              </Button>
            )}
          </div>

          {totalItems > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span className="font-mono tabular-nums">
                  {checkedCount} of {totalItems}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-teal-600 transition-all duration-300 dark:bg-teal-300"
                  style={{ width: `${(checkedCount / totalItems) * 100}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sections */}
      {sections.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={SearchX}
              title="This checklist has no items yet"
              description="Ask your manager to add items to this template."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map(section => (
            <Card key={section.id}>
              <CardContent className="p-4">
                <p className="mb-3 font-medium text-foreground">{section.name}</p>
                <div className="space-y-1">
                  {section.items.map(item => {
                    const isChecked = Boolean(checked[item.id])
                    return (
                      <label
                        key={item.id}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-[9px] px-2 py-2 transition-colors hover:bg-secondary',
                          !onTheClock && 'cursor-not-allowed opacity-60'
                        )}
                      >
                        <Checkbox
                          className="mt-0.5"
                          checked={isChecked}
                          disabled={!onTheClock}
                          onCheckedChange={value =>
                            setChecked(prev => ({ ...prev, [item.id]: value === true }))
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'text-sm text-foreground',
                              isChecked && 'text-muted-foreground line-through'
                            )}
                          >
                            {item.text}
                          </span>
                          {(item.priority === 'high' || item.requiresPhoto) && (
                            <span className="mt-1 flex flex-wrap items-center gap-1.5">
                              {item.priority === 'high' && (
                                <Badge variant="gold" className="text-[10px]">
                                  Priority
                                </Badge>
                              )}
                              {item.requiresPhoto && (
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Camera className="size-3" />
                                  Photo
                                </span>
                              )}
                            </span>
                          )}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Notes + finish */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Notes (optional)
                </label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Anything the manager should know about this stop?"
                  rows={3}
                  disabled={!onTheClock}
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => saveProgress(false)}
                  disabled={!onTheClock || completing}
                >
                  {completing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                  Save progress
                </Button>
                <Button
                  variant="gold"
                  className="flex-1 gap-1.5"
                  onClick={() => saveProgress(true)}
                  disabled={!onTheClock || completing}
                >
                  {completing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : allChecked ? (
                    <CheckCircle className="size-4" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                  {allChecked ? 'Complete & clock out' : 'Clock out & finish'}
                </Button>
              </div>
              {!onTheClock && !clockOut && (
                <p className="text-center text-xs text-muted-foreground">
                  Clock in to start checking off items.
                </p>
              )}
              {clockOut && (
                <p className="text-center text-xs text-muted-foreground">
                  This visit is clocked out. Your saved checklist is shown above.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
