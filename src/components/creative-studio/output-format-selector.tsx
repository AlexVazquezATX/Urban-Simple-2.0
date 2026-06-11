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
              'rounded-[12px] border p-3 text-left transition-all',
              isSelected
                ? 'border-gold-600/40 bg-gold-600/10 ring-1 ring-gold-600/30 dark:border-gold-400/30 dark:bg-gold-400/12 dark:ring-gold-400/25'
                : 'border-border bg-card hover:border-gold-600/30 dark:hover:border-gold-400/25',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-[8px]',
                  isSelected
                    ? 'bg-gold-600/15 text-gold-600 dark:bg-gold-400/15 dark:text-gold-400'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <h4 className="truncate text-sm font-semibold text-foreground">
                  {format.title}
                </h4>
                <p className="truncate font-mono text-xs tabular-nums text-muted-foreground">
                  {format.aspectRatio}
                </p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default OutputFormatSelector
