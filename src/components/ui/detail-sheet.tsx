'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { X, ChevronUp, ChevronDown, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * Right-side slide-over for quick record review — open it from a list row,
 * step through records with ↑/↓ (or the chevrons), Esc to close, and jump
 * to the full record page via the "Open full details" link. The list owns
 * the record array and selection; this is just the chrome.
 */
export function DetailSheet({
  onClose,
  onPrev,
  onNext,
  position,
  total,
  fullHref,
  fullLabel = 'Open full details',
  identity,
  footer,
  children,
}: {
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  position?: number // 1-based index in the current (filtered) list
  total?: number
  fullHref: string
  fullLabel?: string
  identity: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const close = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 200) // wait for the slide-out
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore navigation keys while typing in a field inside the sheet.
      const el = e.target as HTMLElement | null
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (e.key === 'Escape') {
        close()
      } else if (!typing && (e.key === 'ArrowUp' || e.key === 'k') && onPrev) {
        e.preventDefault()
        onPrev()
      } else if (!typing && (e.key === 'ArrowDown' || e.key === 'j') && onNext) {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, onPrev, onNext])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-ink-950/30 transition-opacity duration-200',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={close}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative flex w-full max-w-xl flex-col border-l border-border bg-card shadow-elevated transition-transform duration-200 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Top bar: prev/next + counter · open-full + close */}
        <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/50 px-3 py-2.5">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onPrev}
              disabled={!onPrev}
              aria-label="Previous"
              title="Previous (↑)"
              className="grid size-8 place-items-center rounded-[9px] text-muted-foreground transition-colors enabled:hover:bg-secondary enabled:hover:text-foreground disabled:opacity-30"
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!onNext}
              aria-label="Next"
              title="Next (↓)"
              className="grid size-8 place-items-center rounded-[9px] text-muted-foreground transition-colors enabled:hover:bg-secondary enabled:hover:text-foreground disabled:opacity-30"
            >
              <ChevronDown className="size-4" />
            </button>
            {position && total ? (
              <span className="ml-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                {position} of {total}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            <Button asChild variant="outline" size="sm">
              <Link href={fullHref}>
                {fullLabel}
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="grid size-8 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Identity */}
        <div className="border-b border-border px-5 py-4">{identity}</div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">{children}</div>

        {footer ? <div className="border-t border-border px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  )
}

/** Small labelled section heading used inside quick-view bodies. */
export function SheetSection({
  title,
  count,
  action,
  children,
}: {
  title: string
  count?: number
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="kicker text-muted-foreground">{title}</h3>
          {count !== undefined && (
            <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">{count}</span>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** A label/value row for the info grids. */
export function SheetField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="kicker text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{children || <span className="text-muted-foreground">—</span>}</div>
    </div>
  )
}
