'use client'

import {
  Megaphone,
  BadgePercent,
  Quote,
  Calendar,
  UtensilsCrossed,
  Pencil,
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
  Pencil,
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
        <Label className="mb-2 block">Post Type</Label>
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
                    <h4
                      className={cn(
                        'truncate text-sm font-medium',
                        isSelected ? 'text-gold-600 dark:text-gold-400' : 'text-foreground'
                      )}
                    >
                      {type.title}
                    </h4>
                    <p className="truncate text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom mode hint */}
      {postType === 'custom' && (
        <div className="rounded-[12px] border border-teal-600/30 bg-teal-600/10 p-3 dark:border-teal-300/25 dark:bg-teal-300/12">
          <p className="text-[13px] text-teal-600 dark:text-teal-300">
            Describe your vision in the <strong>Additional Directions</strong> box below. You have full creative control. Tell the AI exactly what you want.
          </p>
        </div>
      )}

      {/* Headline Input */}
      <div>
        <Label htmlFor="headline" className="mb-2 block">
          {postType === 'custom' ? 'Text to Display (optional)' : 'Headline / Text'}
        </Label>
        <Input
          id="headline"
          value={headline}
          onChange={(e) => onHeadlineChange(e.target.value)}
          placeholder={postType === 'custom' ? 'Leave empty for a purely visual graphic' : 'e.g., 20% Off This Weekend!'}
          disabled={disabled}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {postType === 'custom' ? 'Optional. Only add if you want text on the graphic' : 'The main text to display on the graphic'}
        </p>
      </div>

      {/* Brand Kit Info (if selected) */}
      {brandKit && (
        <div className="rounded-[12px] border border-border bg-secondary/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'size-8 rounded-[8px] transition-opacity',
                  !applyBrandColors && 'opacity-30'
                )}
                style={{ backgroundColor: brandKit.primaryColor }}
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {brandKit.restaurantName}
                </p>
                <p className="text-xs text-muted-foreground">
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
                  applyBrandColors ? 'bg-primary' : 'bg-muted-foreground/30',
                  disabled && 'cursor-not-allowed opacity-50'
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
        <Label className="mb-2 block">Aspect Ratio</Label>
        <div className="flex flex-wrap gap-2">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.value}
              onClick={() => onAspectRatioChange(ratio.value)}
              disabled={disabled}
              className={cn(
                'rounded-[10px] border px-3 py-2 text-sm transition-all',
                aspectRatio === ratio.value
                  ? 'border-gold-600/40 bg-gold-600/10 font-medium text-gold-600 dark:border-gold-400/30 dark:bg-gold-400/12 dark:text-gold-400'
                  : 'border-border text-muted-foreground hover:border-gold-600/30 hover:text-foreground dark:hover:border-gold-400/25',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {ratio.label}
            </button>
          ))}
        </div>
      </div>

      {/* Style Preference */}
      <div>
        <Label className="mb-2 block">Style</Label>
        <div className="space-y-2">
          {STYLE_PREFERENCES.map((pref) => (
            <button
              key={pref.value}
              onClick={() => onStyleChange(pref.value)}
              disabled={disabled}
              className={cn(
                'w-full rounded-[12px] border p-3 text-left transition-all',
                style === pref.value
                  ? 'border-gold-600/40 bg-gold-600/10 ring-1 ring-gold-600/30 dark:border-gold-400/30 dark:bg-gold-400/12 dark:ring-gold-400/25'
                  : 'border-border bg-card hover:border-gold-600/30 dark:hover:border-gold-400/25',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <p
                className={cn(
                  'text-sm font-medium',
                  style === pref.value ? 'text-gold-600 dark:text-gold-400' : 'text-foreground'
                )}
              >
                {pref.label}
              </p>
              <p className="text-xs text-muted-foreground">{pref.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BrandedPostForm
