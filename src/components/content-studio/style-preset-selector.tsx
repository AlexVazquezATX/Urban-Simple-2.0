'use client'

import { Package, Sun, Share2, BookOpen, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STYLE_PRESET_LIST, type StylePreset } from '@/lib/config/content-studio'

const ICONS: Record<string, React.FC<{ className?: string }>> = {
  Package,
  Sun,
  Share2,
  BookOpen,
  Pencil,
}

interface StylePresetSelectorProps {
  value: StylePreset | null
  onChange: (value: StylePreset | null) => void
  disabled?: boolean
}

export function StylePresetSelector({ value, onChange, disabled }: StylePresetSelectorProps) {
  const handleClick = (preset: StylePreset) => {
    // Toggle: click again to deselect (goes to no preset = pure prompt)
    onChange(value === preset ? null : preset)
  }

  return (
    <div className="bg-card rounded-[14px] border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-foreground">Style</label>
        <span className="text-xs text-muted-foreground">Optional</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {STYLE_PRESET_LIST.filter((p) => p.id !== 'custom').map((preset) => {
          const Icon = ICONS[preset.icon]
          const isSelected = value === preset.id
          return (
            <button
              key={preset.id}
              onClick={() => handleClick(preset.id)}
              disabled={disabled}
              className={cn(
                'flex items-start gap-2.5 p-3 rounded-[10px] border text-left transition-all',
                isSelected
                  ? 'border-gold-600/30 bg-gold-600/10 ring-1 ring-gold-600/30 dark:border-gold-400/25 dark:bg-gold-400/12 dark:ring-gold-400/25'
                  : 'border-border hover:border-gold-600/30 dark:hover:border-gold-400/25',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    'w-4 h-4 mt-0.5 shrink-0',
                    isSelected ? 'text-gold-600 dark:text-gold-400' : 'text-muted-foreground'
                  )}
                />
              )}
              <div>
                <p className={cn('text-sm font-medium', isSelected ? 'text-gold-600 dark:text-gold-400' : 'text-foreground')}>
                  {preset.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{preset.description}</p>
              </div>
            </button>
          )
        })}
      </div>
      {/* Custom / Prompt Only option */}
      <button
        onClick={() => handleClick('custom')}
        disabled={disabled}
        className={cn(
          'w-full mt-2 p-3 rounded-[10px] border text-center transition-all',
          value === 'custom'
            ? 'border-foreground/40 bg-secondary ring-1 ring-foreground/20'
            : 'border-dashed border-border hover:border-foreground/30',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <p className={cn('text-sm font-medium', value === 'custom' ? 'text-foreground' : 'text-muted-foreground')}>
          Custom / Prompt Only
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your prompt is the only instruction sent to the AI
        </p>
      </button>
      {!value && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          No style selected — your prompt controls everything
        </p>
      )}
    </div>
  )
}
