'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const DAYS = [
  { value: 0, label: 'Sun', short: 'Su' },
  { value: 1, label: 'Mon', short: 'Mo' },
  { value: 2, label: 'Tue', short: 'Tu' },
  { value: 3, label: 'Wed', short: 'We' },
  { value: 4, label: 'Thu', short: 'Th' },
  { value: 5, label: 'Fri', short: 'Fr' },
  { value: 6, label: 'Sat', short: 'Sa' },
]

interface AssignmentScheduleEditorProps {
  assignmentId: string
  locationName: string
  currentData: {
    estimatedHoursPerVisit: number
    cleaningWindowStart: string
    cleaningWindowEnd: string
    daysOfWeek: number[]
    nightsPerWeek: number
    monthlyPay: number
  }
  onSaved: () => void
  children: React.ReactNode
}

export function AssignmentScheduleEditor({
  assignmentId,
  locationName,
  currentData,
  onSaved,
  children,
}: AssignmentScheduleEditorProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [hoursPerVisit, setHoursPerVisit] = useState(currentData.estimatedHoursPerVisit.toString() || '')
  const [windowStart, setWindowStart] = useState(currentData.cleaningWindowStart || '')
  const [windowEnd, setWindowEnd] = useState(currentData.cleaningWindowEnd || '')
  const [selectedDays, setSelectedDays] = useState<number[]>(currentData.daysOfWeek || [])
  const [monthlyPay, setMonthlyPay] = useState(currentData.monthlyPay.toString() || '')

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  const estWeeklyHours = (parseFloat(hoursPerVisit) || 0) * selectedDays.length

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/location-assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimatedHoursPerVisit: parseFloat(hoursPerVisit) || null,
          cleaningWindowStart: windowStart || null,
          cleaningWindowEnd: windowEnd || null,
          daysOfWeek: selectedDays,
          nightsPerWeek: selectedDays.length,
          monthlyPay: parseFloat(monthlyPay) || currentData.monthlyPay,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save')
      }

      toast.success('Assignment updated')
      setOpen(false)
      onSaved()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Reset form when opened
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setHoursPerVisit(currentData.estimatedHoursPerVisit.toString() || '')
      setWindowStart(currentData.cleaningWindowStart || '')
      setWindowEnd(currentData.cleaningWindowEnd || '')
      setSelectedDays(currentData.daysOfWeek || [])
      setMonthlyPay(currentData.monthlyPay.toString() || '')
    }
    setOpen(isOpen)
  }

  // Determine status for the preview
  let hoursStatus: 'safe' | 'watch' | 'warning' | 'danger' = 'safe'
  if (estWeeklyHours >= 40) hoursStatus = 'danger'
  else if (estWeeklyHours >= 38) hoursStatus = 'warning'
  else if (estWeeklyHours >= 32) hoursStatus = 'watch'

  const statusColors: Record<string, string> = {
    safe: 'text-emerald-600 dark:text-emerald-400',
    watch: 'text-sky-600 dark:text-sky-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Edit Schedule</DialogTitle>
          <DialogDescription className="text-sm">
            {locationName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Days of week */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Days of Service</Label>
            <div className="flex gap-1.5">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    'flex-1 h-9 rounded-sm text-xs font-medium transition-colors',
                    selectedDays.includes(day.value)
                      ? 'bg-lime-500 text-white dark:bg-lime-600'
                      : 'bg-warm-100 text-warm-500 dark:bg-charcoal-700 dark:text-charcoal-400 hover:bg-warm-200 dark:hover:bg-charcoal-600'
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-warm-500 dark:text-cream-400">
              {selectedDays.length} night{selectedDays.length !== 1 ? 's' : ''} per week
            </p>
          </div>

          {/* Hours per visit */}
          <div className="space-y-2">
            <Label htmlFor="hoursPerVisit" className="text-sm font-medium">
              Estimated Hours per Visit
            </Label>
            <Input
              id="hoursPerVisit"
              type="number"
              step="0.25"
              min="0"
              max="12"
              placeholder="e.g. 2.5"
              value={hoursPerVisit}
              onChange={(e) => setHoursPerVisit(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Cleaning window */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cleaning Window</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="windowStart" className="text-xs text-warm-500 dark:text-cream-400">Start</Label>
                <Input
                  id="windowStart"
                  type="time"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="windowEnd" className="text-xs text-warm-500 dark:text-cream-400">End</Label>
                <Input
                  id="windowEnd"
                  type="time"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Monthly pay */}
          <div className="space-y-2">
            <Label htmlFor="monthlyPay" className="text-sm font-medium">
              Monthly Pay ($)
            </Label>
            <Input
              id="monthlyPay"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={monthlyPay}
              onChange={(e) => setMonthlyPay(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Live preview */}
          <div className="rounded-sm border border-warm-200 dark:border-charcoal-700 bg-warm-50 dark:bg-charcoal-800/50 p-3">
            <div className="text-xs text-warm-500 dark:text-cream-400 mb-1">Weekly Hours for This Account</div>
            <div className={cn('text-xl font-semibold tabular-nums', statusColors[hoursStatus])}>
              {estWeeklyHours > 0 ? `${estWeeklyHours}h` : '-'}
              <span className="text-sm font-normal text-warm-500 dark:text-cream-400 ml-1">/ week</span>
            </div>
            {hoursStatus === 'danger' && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                This account alone puts this associate at or over 40 hours
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
            className="rounded-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-sm"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
