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
        'h-10 px-3 rounded-sm flex items-center gap-3 w-full transition-all duration-150',
        'text-warm-600 hover:bg-warm-200/60 hover:text-warm-800 dark:text-cream-400 dark:hover:bg-charcoal-800 dark:hover:text-cream-200',
        className
      )}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="h-4.5 w-4.5 text-warm-500 dark:text-cream-400" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-warm-500" />
      )}
      <span className="font-medium text-[13px]">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}
