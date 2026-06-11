'use client'

import { Moon, Sun } from 'lucide-react'
import { useDarkMode } from '@/lib/hooks/use-dark-mode'
import { cn } from '@/lib/utils'

export function DarkModeToggle({ className }: { className?: string }) {
  const { isDark, toggle } = useDarkMode()

  return (
    <button
      onClick={toggle}
      className={cn(
        'h-9 px-2 rounded-lg flex items-center gap-2.5 w-full transition-all duration-150',
        'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
        className
      )}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="font-medium text-[13px]">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}
