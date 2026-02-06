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
              'p-3 rounded-sm border transition-all text-left',
              isSelected
                ? 'border-lime-500 bg-lime-50 ring-1 ring-lime-500'
                : 'border-warm-200 hover:border-warm-300 bg-white',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-sm flex items-center justify-center shrink-0',
                  isSelected ? 'bg-lime-100 text-lime-600' : 'bg-warm-100 text-warm-500'
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4
                  className={cn(
                    'text-sm font-medium truncate',
                    isSelected ? 'text-lime-700' : 'text-warm-900'
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
