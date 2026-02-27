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
    <div className="bg-white rounded-sm border border-warm-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-warm-900">Style</label>
        <span className="text-xs text-warm-400">Optional</span>
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
                'flex items-start gap-2.5 p-3 rounded-sm border text-left transition-all',
                isSelected
                  ? 'border-lime-500 bg-lime-50/50 ring-1 ring-lime-500/30'
                  : 'border-warm-200 hover:border-warm-300',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    'w-4 h-4 mt-0.5 shrink-0',
                    isSelected ? 'text-lime-600' : 'text-warm-400'
                  )}
                />
              )}
              <div>
                <p className={cn('text-sm font-medium', isSelected ? 'text-lime-700' : 'text-warm-800')}>
                  {preset.title}
                </p>
                <p className="text-xs text-warm-500 mt-0.5">{preset.description}</p>
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
          'w-full mt-2 p-3 rounded-sm border text-center transition-all',
          value === 'custom'
            ? 'border-warm-700 bg-warm-50 ring-1 ring-warm-700/20'
            : 'border-dashed border-warm-300 hover:border-warm-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <p className={cn('text-sm font-medium', value === 'custom' ? 'text-warm-800' : 'text-warm-500')}>
          Custom / Prompt Only
        </p>
        <p className="text-xs text-warm-400 mt-0.5">
          Your prompt is the only instruction sent to the AI
        </p>
      </button>
      {!value && (
        <p className="text-xs text-warm-400 mt-2 text-center">
          No style selected — your prompt controls everything
        </p>
      )}
    </div>
  )
}
