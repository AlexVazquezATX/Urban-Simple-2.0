'use client'

import { LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ViewMode = 'table' | 'card'

interface ViewToggleProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
  className?: string
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center gap-1 border rounded-md p-1', className)}>
      <Button
        type="button"
        variant={value === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('table')}
        className="h-8 px-3"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={value === 'card' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('card')}
        className="h-8 px-3"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  )
}


