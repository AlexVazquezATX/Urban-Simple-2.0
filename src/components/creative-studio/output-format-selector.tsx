'use client'

import {
  BookOpen,
  Truck,
  Instagram,
  Smartphone,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  OUTPUT_FORMAT_LIST,
  type OutputFormatId,
} from '@/lib/config/restaurant-studio'

interface OutputFormatSelectorProps {
  value: OutputFormatId
  onChange: (format: OutputFormatId) => void
  disabled?: boolean
}

// Map icon names to components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Truck,
  Instagram,
  Smartphone,
}

export function OutputFormatSelector({
  value,
  onChange,
  disabled,
}: OutputFormatSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {OUTPUT_FORMAT_LIST.map((format) => {
        const Icon = ICON_MAP[format.icon] || BookOpen
        const isSelected = value === format.id

        return (
          <button
            key={format.id}
            onClick={() => onChange(format.id)}
            disabled={disabled}
            className={cn(
              'p-3 rounded-xl border transition-all text-left',
              isSelected
                ? 'border-bronze-400 bg-bronze-50 ring-1 ring-bronze-300'
                : 'border-cream-300 hover:border-bronze-200 bg-white',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  isSelected ? 'bg-bronze-100 text-bronze-700' : 'bg-cream-200 text-warm-500'
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4
                  className={cn(
                    'text-sm font-semibold truncate',
                    isSelected ? 'text-charcoal-900' : 'text-charcoal-800'
                  )}
                >
                  {format.title}
                </h4>
                <p className="text-xs text-warm-500 truncate">{format.aspectRatio}</p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default OutputFormatSelector
