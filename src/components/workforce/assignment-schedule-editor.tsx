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
    safe: 'text-green-600 dark:text-green-300',
    watch: 'text-teal-600 dark:text-teal-300',
    warning: 'text-gold-600 dark:text-gold-400',
    danger: 'text-coral-600 dark:text-coral-300',
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Schedule</DialogTitle>
          <DialogDescription className="text-sm">
            {locationName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Days of week */}
          <div className="space-y-2">
            <Label>Days of Service</Label>
            <div className="flex gap-1.5">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    'h-9 flex-1 cursor-pointer rounded-[9px] text-xs font-medium transition-colors',
                    selectedDays.includes(day.value)
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedDays.length} night{selectedDays.length !== 1 ? 's' : ''} per week
            </p>
          </div>

          {/* Hours per visit */}
          <div className="space-y-2">
            <Label htmlFor="hoursPerVisit">
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
            <Label>Cleaning Window</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="windowStart" className="mb-1.5">Start</Label>
                <Input
                  id="windowStart"
                  type="time"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="windowEnd" className="mb-1.5">End</Label>
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
            <Label htmlFor="monthlyPay">
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
          <div className="rounded-[12px] border border-border bg-secondary/50 p-3">
            <div className="kicker mb-1.5 text-muted-foreground">Weekly Hours for This Account</div>
            <div className={cn('font-display text-xl font-bold tabular-nums', statusColors[hoursStatus])}>
              {estWeeklyHours > 0 ? `${estWeeklyHours}h` : '—'}
              <span className="ml-1 font-sans text-sm font-normal text-muted-foreground">/ week</span>
            </div>
            {hoursStatus === 'danger' && (
              <p className="mt-1 text-xs text-coral-600 dark:text-coral-300">
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
          >
            Cancel
          </Button>
          <Button
            variant="gold"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
