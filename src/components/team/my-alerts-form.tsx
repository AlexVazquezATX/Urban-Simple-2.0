'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, MessageSquareText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/layout/page-header'
import { useManagerLang } from '@/lib/i18n/use-manager-lang'
import { SMS_CONSENT_TEXT, SMS_CONSENT_TEXT_ES } from '@/lib/notify/sms-consent'

function digitsOnly(v: string | null | undefined) {
  return (v ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
}

// A staff member's own text alert opt-in. Same rule as the client portal: texts
// start only after they check the unchecked consent box and save.
export function MyAlertsForm({
  initialPhone,
  initialSmsAlerts,
  smsAvailable,
}: {
  initialPhone: string | null
  initialSmsAlerts: boolean
  smsAvailable: boolean
}) {
  const router = useRouter()
  const { t, lang } = useManagerLang()
  const m = t.myAlerts
  const [savedOn, setSavedOn] = useState(initialSmsAlerts)
  const [savedPhone, setSavedPhone] = useState(initialPhone ?? '')
  const [smsAlerts, setSmsAlerts] = useState(initialSmsAlerts)
  const [phone, setPhone] = useState(initialPhone ?? '')
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)

  const needsConsent = smsAlerts && (!savedOn || digitsOnly(phone) !== digitsOnly(savedPhone))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (smsAlerts && !phone.trim()) {
      toast.error(m.needPhone)
      return
    }
    if (needsConsent && !consent) {
      toast.error(m.needConsent)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smsAlerts,
          // Turning off never touches the number on file.
          ...(smsAlerts ? { phone } : {}),
          smsConsent: needsConsent ? consent : undefined,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || m.saveFailed)
      toast.success(m.saved)
      setSavedOn(smsAlerts)
      if (smsAlerts) setSavedPhone(phone)
      setConsent(false)
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : m.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader kicker={m.kicker} title={m.title} subtitle={m.subtitle} />

      <form onSubmit={save} className="max-w-xl space-y-4">
        <section className="rounded-[12px] border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <Label htmlFor="my-sms-alerts" className="flex items-center gap-2 font-medium text-foreground">
                <MessageSquareText className="h-4 w-4" />
                {m.switchLabel}
              </Label>
              <p className="text-xs text-muted-foreground">{smsAvailable ? m.switchHint : m.unavailable}</p>
            </div>
            <Switch
              id="my-sms-alerts"
              checked={smsAlerts}
              onCheckedChange={setSmsAlerts}
              disabled={!smsAvailable}
            />
          </div>

          {smsAlerts && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <div className="space-y-2">
                <Label htmlFor="my-phone">{m.mobile}</Label>
                <Input
                  id="my-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(512) 555-0123"
                  className="sm:max-w-[260px]"
                />
              </div>
              {needsConsent && (
                <label className="flex items-start gap-3 rounded-[10px] bg-secondary px-4 py-3.5">
                  <Checkbox
                    checked={consent}
                    onCheckedChange={v => setConsent(v === true)}
                    className="mt-0.5"
                    aria-label={m.switchLabel}
                  />
                  <span className="text-xs leading-relaxed text-foreground">
                    {lang === 'es' ? SMS_CONSENT_TEXT_ES : SMS_CONSENT_TEXT} {m.see}{' '}
                    <a href="/terms" target="_blank" className="underline">{m.terms}</a> {m.and}{' '}
                    <a href="/privacy" target="_blank" className="underline">{m.privacy}</a>.
                  </span>
                </label>
              )}
            </div>
          )}
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {m.save}
          </Button>
        </div>
      </form>
    </div>
  )
}
