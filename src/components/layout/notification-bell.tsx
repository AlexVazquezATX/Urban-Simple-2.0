'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useManagerLang } from '@/lib/i18n/use-manager-lang'
import { dateFnsLocale } from '@/lib/i18n/manager'

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

const POLL_MS = 60_000

const DOT_TONE: Record<string, string> = {
  warning: 'bg-coral-600 dark:bg-coral-300',
  action_required: 'bg-gold-600 dark:bg-gold-400',
  success: 'bg-green-600 dark:bg-green-300',
  info: 'bg-teal-600 dark:bg-teal-300',
}

// Staff bell: unread badge + dropdown of the latest notifications. Polls every
// 60s while the tab is visible, and refetches when the tab comes back.
export function NotificationBell({
  className,
  align = 'end',
}: {
  className?: string
  align?: 'start' | 'center' | 'end'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const inFlight = useRef(false)
  const { lang, t } = useManagerLang()

  const load = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const res = await fetch('/api/notifications', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { notifications: NotificationItem[]; unreadCount: number }
      setItems(data.notifications)
      setUnread(data.unreadCount)
    } catch {
      // Network blips are fine; the next poll catches up.
    } finally {
      inFlight.current = false
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const markRead = async (body: { ids?: string[]; all?: boolean }) => {
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = (await res.json()) as { unreadCount: number }
      setUnread(data.unreadCount)
    }
  }

  const handleClick = (n: NotificationItem) => {
    if (!n.isRead) {
      setItems(prev => prev.map(x => (x.id === n.id ? { ...x, isRead: true } : x)))
      setUnread(u => Math.max(0, u - 1))
      void markRead({ ids: [n.id] })
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  const handleMarkAll = async () => {
    setMarkingAll(true)
    try {
      await markRead({ all: true })
      setItems(prev => prev.map(x => ({ ...x, isRead: true })))
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t.bell.aria(unread)}
          className={cn(
            'relative grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground',
            className
          )}
        >
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid min-w-[17px] place-items-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold leading-[17px] text-primary-foreground">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-[14px] border-border p-0"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display text-[14px] font-semibold text-foreground">{t.bell.title}</p>
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={unread === 0 || markingAll}
            className="flex items-center gap-1 text-xs font-medium text-primary disabled:text-muted-foreground disabled:opacity-60"
          >
            {markingAll ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCheck className="size-3.5" />}
            {t.bell.markAll}
          </button>
        </div>
        <div className="max-h-[min(440px,70vh)] overflow-y-auto">
          {!loaded ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t.bell.caughtUp}
            </p>
          ) : (
            items.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                className={cn(
                  'flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-secondary/50',
                  !n.isRead && 'bg-gold-600/[0.04] dark:bg-gold-400/[0.05]'
                )}
              >
                <span
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    n.isRead ? 'bg-transparent' : DOT_TONE[n.type] ?? DOT_TONE.info
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-[13px] leading-snug text-foreground',
                      !n.isRead && 'font-semibold'
                    )}
                  >
                    {n.title}
                  </span>
                  {n.message && (
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                      {n.message}
                    </span>
                  )}
                  <span className="mt-1 block font-mono text-[10.5px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                      locale: dateFnsLocale(lang),
                    })}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
