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
      <div className="bg-white rounded-sm border border-warm-200 p-5">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-8 h-8 bg-warm-200 rounded-sm" />
          <div className="flex-1">
            <div className="h-3 w-24 bg-warm-200 rounded" />
            <div className="h-2 w-32 bg-warm-100 rounded mt-1.5" />
          </div>
        </div>
      </div>
    )
  }

  if (!brandKit) {
    return (
      <div className="bg-white rounded-sm border border-warm-200 p-5">
        <p className="text-xs text-warm-400">
          No brand kit found.{' '}
          <a href="/studio/brand-kit" className="text-lime-600 hover:text-lime-700 underline">
            Create one
          </a>{' '}
          to auto-apply your brand identity.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-sm border border-warm-200 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Color swatches */}
          <div className="flex -space-x-1">
            <div
              className="w-7 h-7 rounded-sm border border-warm-200"
              style={{ backgroundColor: brandKit.primaryColor }}
            />
            {brandKit.secondaryColor && (
              <div
                className="w-7 h-7 rounded-sm border border-warm-200"
                style={{ backgroundColor: brandKit.secondaryColor }}
              />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-warm-800">{brandKit.restaurantName}</p>
            <p className="text-xs text-warm-400">Brand identity</p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => onToggle(!enabled)}
          className={cn(
            'relative w-10 h-5 rounded-full transition-colors',
            enabled ? 'bg-lime-500' : 'bg-warm-300'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>
    </div>
  )
}
