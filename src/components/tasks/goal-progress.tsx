'use client'

import { cn } from '@/lib/utils'

interface GoalProgressProps {
  progress: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  color?: string
  className?: string
}

export function GoalProgress({
  progress,
  size = 'md',
  showLabel = true,
  color = '#3B82F6',
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

  // Get color based on progress if no custom color
  const progressColor = progress >= 100 ? '#22C55E' : progress >= 50 ? color : color

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 bg-charcoal-100 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clampedProgress}%`,
            backgroundColor: progressColor,
          }}
        />
      </div>
      {showLabel && (
        <span className={cn('font-medium text-charcoal-600 tabular-nums', textSizeClasses[size])}>
          {clampedProgress}%
        </span>
      )}
    </div>
  )
}
