'use client'

import { useState, useEffect } from 'react'
import {
  Megaphone,
  BadgePercent,
  Quote,
  Calendar,
  UtensilsCrossed,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  BRANDED_POST_TYPE_LIST,
  STYLE_PREFERENCES,
  type BrandedPostType,
} from '@/lib/config/restaurant-studio'

interface BrandKit {
  id: string
  restaurantName: string
  primaryColor: string
  secondaryColor?: string | null
  preferredStyle?: string | null
}

interface BrandedPostFormProps {
  postType: BrandedPostType
  onPostTypeChange: (type: BrandedPostType) => void
  headline: string
  onHeadlineChange: (headline: string) => void
  style: string
  onStyleChange: (style: string) => void
  aspectRatio: '1:1' | '4:5' | '9:16' | '16:9'
  onAspectRatioChange: (ratio: '1:1' | '4:5' | '9:16' | '16:9') => void
  brandKit?: BrandKit | null
  applyBrandColors?: boolean
  onApplyBrandColorsChange?: (apply: boolean) => void
  disabled?: boolean
}

// Map icon names to components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Megaphone,
  BadgePercent,
  Quote,
  Calendar,
  UtensilsCrossed,
}

const ASPECT_RATIOS = [
  { value: '1:1', label: 'Square', description: 'Feed posts' },
  { value: '4:5', label: 'Portrait', description: 'Instagram optimal' },
  { value: '9:16', label: 'Stories', description: 'Reels & Stories' },
  { value: '16:9', label: 'Landscape', description: 'Headers' },
] as const

export function BrandedPostForm({
  postType,
  onPostTypeChange,
  headline,
  onHeadlineChange,
  style,
  onStyleChange,
  aspectRatio,
  onAspectRatioChange,
  brandKit,
  applyBrandColors = true,
  onApplyBrandColorsChange,
  disabled = false,
}: BrandedPostFormProps) {
  return (
    <div className="space-y-5">
      {/* Post Type Selection */}
      <div>
        <Label className="text-warm-700 mb-2 block">Post Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {BRANDED_POST_TYPE_LIST.map((type) => {
            const Icon = ICON_MAP[type.icon] || Megaphone
            const isSelected = postType === type.id

            return (
              <button
                key={type.id}
                onClick={() => onPostTypeChange(type.id)}
                disabled={disabled}
                className={cn(
                  'p-3 rounded-sm border transition-all text-left',
                  isSelected
                    ? 'border-plum-500 bg-plum-50 ring-1 ring-plum-500'
                    : 'border-warm-200 hover:border-warm-300 bg-white',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-sm flex items-center justify-center shrink-0',
                      isSelected ? 'bg-plum-100 text-plum-600' : 'bg-warm-100 text-warm-500'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4
                      className={cn(
                        'text-sm font-medium truncate',
                        isSelected ? 'text-plum-700' : 'text-warm-900'
                      )}
                    >
                      {type.title}
                    </h4>
                    <p className="text-xs text-warm-500 truncate">{type.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Headline Input */}
      <div>
        <Label htmlFor="headline" className="text-warm-700 mb-2 block">
          Headline / Text
        </Label>
        <Input
          id="headline"
          value={headline}
          onChange={(e) => onHeadlineChange(e.target.value)}
          placeholder="e.g., 20% Off This Weekend!"
          disabled={disabled}
          className="rounded-sm"
        />
        <p className="text-xs text-warm-500 mt-1">
          The main text to display on the graphic
        </p>
      </div>

      {/* Brand Kit Info (if selected) */}
      {brandKit && (
        <div className="p-3 rounded-sm bg-warm-50 border border-warm-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-8 h-8 rounded-sm transition-opacity',
                  !applyBrandColors && 'opacity-30'
                )}
                style={{ backgroundColor: brandKit.primaryColor }}
              />
              <div>
                <p className="text-sm font-medium text-warm-900">
                  {brandKit.restaurantName}
                </p>
                <p className="text-xs text-warm-500">
                  {applyBrandColors ? 'Brand colors applied' : 'Brand colors off'}
                </p>
              </div>
            </div>
            {onApplyBrandColorsChange && (
              <button
                onClick={() => onApplyBrandColorsChange(!applyBrandColors)}
                disabled={disabled}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                  applyBrandColors ? 'bg-plum-500' : 'bg-warm-300',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                    applyBrandColors ? 'translate-x-4.5' : 'translate-x-0.75'
                  )}
                />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Aspect Ratio */}
      <div>
        <Label className="text-warm-700 mb-2 block">Aspect Ratio</Label>
        <div className="flex flex-wrap gap-2">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.value}
              onClick={() => onAspectRatioChange(ratio.value)}
              disabled={disabled}
              className={cn(
                'px-3 py-2 rounded-sm border text-sm transition-all',
                aspectRatio === ratio.value
                  ? 'border-plum-500 bg-plum-50 text-plum-700 font-medium'
                  : 'border-warm-200 hover:border-warm-300 text-warm-700',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {ratio.label}
            </button>
          ))}
        </div>
      </div>

      {/* Style Preference */}
      <div>
        <Label className="text-warm-700 mb-2 block">Style</Label>
        <div className="space-y-2">
          {STYLE_PREFERENCES.map((pref) => (
            <button
              key={pref.value}
              onClick={() => onStyleChange(pref.value)}
              disabled={disabled}
              className={cn(
                'w-full p-3 rounded-sm border transition-all text-left',
                style === pref.value
                  ? 'border-plum-500 bg-plum-50'
                  : 'border-warm-200 hover:border-warm-300 bg-white',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <p
                className={cn(
                  'text-sm font-medium',
                  style === pref.value ? 'text-plum-700' : 'text-warm-900'
                )}
              >
                {pref.label}
              </p>
              <p className="text-xs text-warm-500">{pref.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BrandedPostForm
