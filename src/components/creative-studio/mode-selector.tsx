'use client'

import { Camera, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GenerationMode } from '@/lib/config/restaurant-studio'

interface ModeSelectorProps {
  value: GenerationMode
  onChange: (mode: GenerationMode) => void
  disabled?: boolean
}

const MODES = [
  {
    id: 'food_photo' as GenerationMode,
    title: 'Food Photography',
    description: 'Transform dish photos into professional images',
    icon: Camera,
  },
  {
    id: 'branded_post' as GenerationMode,
    title: 'Branded Posts',
    description: 'Create promotional graphics with your brand',
    icon: Sparkles,
  },
]

export function ModeSelector({ value, onChange, disabled }: ModeSelectorProps) {
  return (
    <div className="flex gap-3">
      {MODES.map((mode) => {
        const Icon = mode.icon
        const isSelected = value === mode.id

        return (
          <button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            disabled={disabled}
            className={cn(
              'flex-1 rounded-[14px] border p-4 text-left transition-all',
              isSelected
                ? 'border-gold-600/40 bg-gold-600/10 ring-1 ring-gold-600/30 dark:border-gold-400/30 dark:bg-gold-400/12 dark:ring-gold-400/25'
                : 'border-border bg-card hover:border-gold-600/30 dark:hover:border-gold-400/25',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-[10px]',
                  isSelected
                    ? 'bg-gold-600/15 text-gold-600 dark:bg-gold-400/15 dark:text-gold-400'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                <Icon className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {mode.title}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{mode.description}</p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default ModeSelector
