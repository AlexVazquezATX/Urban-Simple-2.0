/**
 * Generate recurring shifts based on a pattern
 */

export interface RecurringPattern {
  type: 'weekly'
  daysOfWeek: number[] // 0=Sunday, 1=Monday, etc.
  startTime: string // "21:00"
  endTime: string // "02:00"
  startDate: string // ISO date string
  endDate?: string // ISO date string (optional)
}

export interface ShiftInput {
  locationId: string
  branchId: string
  associateId: string
  managerId?: string
  recurringPattern: RecurringPattern
  notes?: string
}

export interface GeneratedShift {
  locationId: string
  branchId: string
  associateId: string
  managerId?: string
  date: Date
  startTime: string
  endTime: string
  isRecurring: boolean
  recurringPattern: RecurringPattern | null
  notes?: string
  status: string
}

/**
 * Generate shifts for a date range based on recurring pattern
 */
export function generateRecurringShifts(
  input: ShiftInput,
  rangeStart: Date,
  rangeEnd: Date
): GeneratedShift[] {
  const { recurringPattern } = input
  const shifts: GeneratedShift[] = []

  if (recurringPattern.type !== 'weekly') {
    throw new Error('Only weekly recurrence is currently supported')
  }

  const patternStart = new Date(recurringPattern.startDate)
  const patternEnd = recurringPattern.endDate
    ? new Date(recurringPattern.endDate)
    : null

  // Determine the actual start date (max of pattern start and range start)
  const actualStart = patternStart > rangeStart ? patternStart : rangeStart
  const actualEnd = patternEnd && patternEnd < rangeEnd ? patternEnd : rangeEnd

  // Generate shifts for each day in the range
  const currentDate = new Date(actualStart)
  currentDate.setHours(0, 0, 0, 0)

  while (currentDate <= actualEnd) {
    const dayOfWeek = currentDate.getDay()

    // Check if this day matches the pattern
    if (recurringPattern.daysOfWeek.includes(dayOfWeek)) {
      // Check if date is within pattern range
      if (currentDate >= patternStart && (!patternEnd || currentDate <= patternEnd)) {
        shifts.push({
          locationId: input.locationId,
          branchId: input.branchId,
          associateId: input.associateId,
          managerId: input.managerId,
          date: new Date(currentDate),
          startTime: recurringPattern.startTime,
          endTime: recurringPattern.endTime,
          isRecurring: true,
          recurringPattern,
          notes: input.notes,
          status: 'scheduled',
        })
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return shifts
}

/**
 * Get next occurrence date for a recurring pattern
 */
export function getNextOccurrence(pattern: RecurringPattern, fromDate: Date = new Date()): Date | null {
  if (pattern.type !== 'weekly') {
    return null
  }

  const patternStart = new Date(pattern.startDate)
  const patternEnd = pattern.endDate ? new Date(pattern.endDate) : null

  // If pattern hasn't started yet, return start date
  if (fromDate < patternStart) {
    const startDay = patternStart.getDay()
    if (pattern.daysOfWeek.includes(startDay)) {
      return patternStart
    }
  }

  // Find next occurrence
  const currentDate = new Date(fromDate)
  currentDate.setHours(0, 0, 0, 0)

  // Check up to 14 days ahead (2 weeks)
  for (let i = 0; i < 14; i++) {
    const checkDate = new Date(currentDate)
    checkDate.setDate(checkDate.getDate() + i)
    const dayOfWeek = checkDate.getDay()

    if (
      pattern.daysOfWeek.includes(dayOfWeek) &&
      checkDate >= patternStart &&
      (!patternEnd || checkDate <= patternEnd)
    ) {
      return checkDate
    }
  }

  return null
}


