'use client'

import { cn } from '@/lib/utils'

interface GoalProgressProps {
  progress: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  /** Legacy per-goal hex color — ignored; bars are track-secondary/fill-gold per the design system. */
  color?: string
  className?: string
}

export function GoalProgress({
  progress,
  size = 'md',
  showLabel = true,
  className,
}: GoalProgressProps) {
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress))
  const complete = clampedProgress >= 100

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 overflow-hidden rounded-full bg-secondary', sizeClasses[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            complete ? 'bg-green-600 dark:bg-green-300' : 'bg-primary'
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <span
          className={cn(
            'font-mono font-medium tabular-nums text-muted-foreground',
            textSizeClasses[size]
          )}
        >
          {clampedProgress}%
        </span>
      )}
    </div>
  )
}
