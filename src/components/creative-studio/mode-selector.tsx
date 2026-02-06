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
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    id: 'branded_post' as GenerationMode,
    title: 'Branded Posts',
    description: 'Create promotional graphics with your brand',
    icon: Sparkles,
    gradient: 'from-purple-500 to-pink-500',
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
              'flex-1 p-4 rounded-sm border-2 transition-all text-left',
              isSelected
                ? 'border-lime-500 bg-lime-50'
                : 'border-warm-200 hover:border-warm-300 bg-white',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-sm flex items-center justify-center shrink-0',
                  isSelected
                    ? `bg-gradient-to-br ${mode.gradient} text-white`
                    : 'bg-warm-100 text-warm-500'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3
                  className={cn(
                    'text-sm font-medium',
                    isSelected ? 'text-lime-700' : 'text-warm-900'
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
