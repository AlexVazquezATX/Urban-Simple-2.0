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
              'flex-1 p-4 rounded-xl border transition-all text-left',
              isSelected
                ? 'border-bronze-400 bg-bronze-50 ring-1 ring-bronze-300'
                : 'border-cream-300 hover:border-bronze-200 bg-white',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  isSelected
                    ? 'bg-bronze-100 text-bronze-700'
                    : 'bg-cream-200 text-warm-500'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3
                  className={cn(
                    'text-sm font-semibold',
                    isSelected ? 'text-charcoal-900' : 'text-charcoal-800'
                  )}
                >
                  {mode.title}
                </h3>
                <p className="text-xs text-warm-500 mt-0.5">{mode.description}</p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default ModeSelector
