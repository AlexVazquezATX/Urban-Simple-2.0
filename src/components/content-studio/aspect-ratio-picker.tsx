'use client'

import { cn } from '@/lib/utils'
import { ASPECT_RATIOS, type AspectRatio } from '@/lib/config/content-studio'

interface AspectRatioPickerProps {
  value: AspectRatio
  onChange: (value: AspectRatio) => void
  disabled?: boolean
}

export function AspectRatioPicker({ value, onChange, disabled }: AspectRatioPickerProps) {
  return (
    <div className="bg-card rounded-[14px] border border-border p-5">
      <label className="block text-sm font-medium text-foreground mb-3">
        Aspect Ratio
      </label>
      <div className="flex flex-wrap gap-2">
        {ASPECT_RATIOS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={cn(
              'px-3.5 py-2 rounded-[9px] border text-sm transition-all',
              value === option.value
                ? 'border-gold-600/30 bg-gold-600/10 ring-1 ring-gold-600/30 text-gold-600 font-medium dark:border-gold-400/25 dark:bg-gold-400/12 dark:ring-gold-400/25 dark:text-gold-400'
                : 'border-border hover:border-gold-600/30 dark:hover:border-gold-400/25 text-foreground',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className="font-medium font-mono tabular-nums">{option.label}</span>
            <span className="text-muted-foreground ml-1.5 text-xs">({option.hint})</span>
          </button>
        ))}
      </div>
    </div>
  )
}
