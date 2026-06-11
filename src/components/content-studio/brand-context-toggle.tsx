'use client'

import { cn } from '@/lib/utils'

interface BrandKit {
  id: string
  restaurantName: string
  primaryColor: string
  secondaryColor?: string | null
}

interface BrandContextToggleProps {
  brandKit: BrandKit | null
  enabled: boolean
  onToggle: (enabled: boolean) => void
  loading?: boolean
}

export function BrandContextToggle({
  brandKit,
  enabled,
  onToggle,
  loading,
}: BrandContextToggleProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-[14px] border border-border p-5">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-8 h-8 bg-secondary rounded-[6px]" />
          <div className="flex-1">
            <div className="h-3 w-24 bg-secondary rounded" />
            <div className="h-2 w-32 bg-secondary/60 rounded mt-1.5" />
          </div>
        </div>
      </div>
    )
  }

  if (!brandKit) {
    return (
      <div className="bg-card rounded-[14px] border border-border p-5">
        <p className="text-xs text-muted-foreground">
          No brand kit found.{' '}
          <a href="/studio/brand-kit" className="text-gold-600 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300 underline">
            Create one
          </a>{' '}
          to auto-apply your brand identity.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-[14px] border border-border p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Color swatches */}
          <div className="flex -space-x-1">
            <div
              className="w-7 h-7 rounded-[6px] border border-border"
              style={{ backgroundColor: brandKit.primaryColor }}
            />
            {brandKit.secondaryColor && (
              <div
                className="w-7 h-7 rounded-[6px] border border-border"
                style={{ backgroundColor: brandKit.secondaryColor }}
              />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{brandKit.restaurantName}</p>
            <p className="text-xs text-muted-foreground">Brand identity</p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => onToggle(!enabled)}
          className={cn(
            'relative w-10 h-5 rounded-full transition-colors',
            enabled ? 'bg-primary' : 'bg-input dark:bg-input/80'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-background dark:bg-foreground shadow-sm transition-transform',
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>
    </div>
  )
}
