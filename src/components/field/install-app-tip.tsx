'use client'

// Nudges crew to put the app on their home screen so it opens like an app
// (full screen, one tap). Phones only; hidden once installed or dismissed.
// Android gets the real install prompt; iPhone gets the two-step instructions
// because Safari has no install API.

import { useEffect, useState } from 'react'
import { Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FIELD_STRINGS, type FieldLang } from '@/lib/ops/field-i18n'

const DISMISS_KEY = 'us-install-tip-dismissed'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

export function InstallAppTip({ lang }: { lang: FieldLang }) {
  const t = FIELD_STRINGS[lang]
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null)
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return
    } catch {
      // storage blocked: still show the tip
    }
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) return
    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod/i.test(ua)) setPlatform('ios')
    else if (/Android/i.test(ua)) setPlatform('android')

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as InstallPromptEvent)
      setPlatform('android')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function dismiss() {
    setPlatform(null)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore
    }
  }

  if (!platform) return null

  return (
    <div className="flex items-start gap-3 rounded-[14px] border border-border bg-card p-4">
      <Smartphone className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium text-foreground">{t.installTitle}</p>
        <p className="text-sm text-muted-foreground">{platform === 'ios' ? t.installIos : t.installAndroid}</p>
        <div className="flex gap-2">
          {promptEvent && (
            <Button
              variant="gold"
              size="sm"
              onClick={async () => {
                await promptEvent.prompt().catch(() => {})
                dismiss()
              }}
            >
              {t.installAction}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={dismiss}>
            {t.dismiss}
          </Button>
        </div>
      </div>
      <button type="button" aria-label={t.dismiss} onClick={dismiss} className="text-muted-foreground">
        <X className="size-4" />
      </button>
    </div>
  )
}
