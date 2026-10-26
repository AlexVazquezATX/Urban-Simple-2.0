'use client'

import { useManagerLang } from '@/lib/i18n/use-manager-lang'
import type { ManagerLang } from '@/lib/i18n/manager'
import { cn } from '@/lib/utils'

const OPTIONS: { value: ManagerLang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
]

// English / Español switch for manager screens. Saves to the profile and device.
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, t, setLang } = useManagerLang()
  return (
    <div
      role="group"
      aria-label={t.common.languageLabel}
      className={cn(
        'inline-flex shrink-0 items-center rounded-[9px] border border-border bg-secondary/40 p-0.5 text-xs font-medium',
        className
      )}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={lang === opt.value}
          onClick={() => lang !== opt.value && setLang(opt.value)}
          className={cn(
            'rounded-[7px] px-2.5 py-1 transition-colors',
            lang === opt.value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
