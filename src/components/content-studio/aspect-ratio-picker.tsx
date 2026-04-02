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
    <div className="bg-white dark:bg-charcoal-900 rounded-sm border border-warm-200 dark:border-charcoal-700 p-5">
      <label className="block text-sm font-medium text-warm-900 dark:text-cream-100 mb-3">
        Aspect Ratio
      </label>
      <div className="flex flex-wrap gap-2">
        {ASPECT_RATIOS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={cn(
              'px-3.5 py-2 rounded-sm border text-sm transition-all',
              value === option.value
                ? 'border-lime-500 bg-lime-50/50 ring-1 ring-lime-500/30 text-lime-700 font-medium'
                : 'border-warm-200 dark:border-charcoal-700 hover:border-warm-300 text-warm-700 dark:text-cream-300',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className="font-medium">{option.label}</span>
            <span className="text-warm-400 dark:text-cream-400 ml-1.5 text-xs">({option.hint})</span>
          </button>
        ))}
      </div>
    </div>
  )
}
