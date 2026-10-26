'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Mail, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export const SMS_CONSENT_TEXT =
  'I agree to receive service alert text messages from Urban Simple at this number. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.'

export interface AlertsContact {
  email: string
  phone: string | null
  alertEmail: boolean
  alertSms: boolean
  locationIds: string[]
  smsConsentAt: string | null
  smsOptedOutAt: string | null
}

function digitsOnly(v: string | null | undefined) {
  return (v ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
}

export function AlertsForm({
  contact,
  locations,
  smsAvailable,
}: {
  contact: AlertsContact
  locations: Array<{ id: string; name: string }>
  smsAvailable: boolean
}) {
  const router = useRouter()
  const [alertEmail, setAlertEmail] = useState(contact.alertEmail)
  const [alertSms, setAlertSms] = useState(contact.alertSms && !contact.smsOptedOutAt)
  const [phone, setPhone] = useState(contact.phone ?? '')
  const [locationIds, setLocationIds] = useState<string[]>(contact.locationIds)
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)

  const smsActiveBefore = contact.alertSms && !!contact.smsConsentAt && !contact.smsOptedOutAt
  const phoneChanged = digitsOnly(phone) !== digitsOnly(contact.phone)
  const needsConsent = alertSms && (!smsActiveBefore || phoneChanged)

  const toggleLocation = (id: string, checked: boolean) => {
    setLocationIds(prev => (checked ? [...new Set([...prev, id])] : prev.filter(x => x !== id)))
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (alertSms && !phone.trim()) {
      toast.error('Add a mobile number to get text alerts.')
      return
    }
    if (needsConsent && !consent) {
      toast.error('Please check the box to agree to text alerts.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/portal/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertEmail,
          alertSms,
          phone,
          locationIds,
          smsConsent: needsConsent ? consent : undefined,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Could not save')
      toast.success('Alert settings saved.')
      setConsent(false)
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <section className="rounded-[18px] border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex items-start gap-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-600/10 text-gold-600">
            <Mail className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <Label htmlFor="alert-email" className="font-display text-[15px] font-semibold">
              Email alerts
            </Label>
            <p className="mt-0.5 text-[12.5px] text-cream-700">
              Unfinished work after a visit and updates on issues, sent to {contact.email}.
            </p>
          </div>
          <Switch id="alert-email" checked={alertEmail} onCheckedChange={setAlertEmail} />
        </div>
      </section>

      <section className="rounded-[18px] border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex items-start gap-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-600/10 text-gold-600">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <Label htmlFor="alert-sms" className="font-display text-[15px] font-semibold">
              Text alerts
            </Label>
            <p className="mt-0.5 text-[12.5px] text-cream-700">
              {smsAvailable
                ? 'A short text when something at your location needs attention.'
                : 'Text alerts are not available yet. Email alerts work today.'}
            </p>
            {contact.smsOptedOutAt && (
              <p className="mt-1 text-[12px] text-peach-deep">
                You replied STOP, so texts are paused. Turn this on to start them again.
              </p>
            )}
          </div>
          <Switch
            id="alert-sms"
            checked={alertSms}
            onCheckedChange={setAlertSms}
            disabled={!smsAvailable}
          />
        </div>

        {alertSms && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <div className="space-y-2">
              <Label htmlFor="alert-phone">Mobile number</Label>
              <Input
                id="alert-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(512) 555-0123"
                className="rounded-xl bg-cream-50 sm:max-w-[260px]"
              />
            </div>
            {needsConsent && (
              <label className="flex items-start gap-3 rounded-[13px] bg-secondary px-4 py-3.5">
                <Checkbox
                  checked={consent}
                  onCheckedChange={v => setConsent(v === true)}
                  className="mt-0.5"
                  aria-label="Agree to text alerts"
                />
                <span className="text-[12.5px] leading-relaxed text-foreground">{SMS_CONSENT_TEXT}</span>
              </label>
            )}
          </div>
        )}
      </section>

      {locations.length > 1 && (
        <section className="rounded-[18px] border border-border bg-card p-5 shadow-soft sm:p-6">
          <p className="font-display text-[15px] font-semibold text-foreground">Which locations?</p>
          <p className="mt-0.5 text-[12.5px] text-cream-700">
            Leave them all unchecked to hear about every location.
          </p>
          <div className="mt-3 space-y-1">
            {locations.map(l => (
              <label
                key={l.id}
                className="flex items-center gap-3 rounded-xl px-1 py-2 text-[14px] text-foreground"
              >
                <Checkbox
                  checked={locationIds.includes(l.id)}
                  onCheckedChange={v => toggleLocation(l.id, v === true)}
                />
                {l.name}
              </label>
            ))}
          </div>
        </section>
      )}

      <div className="flex justify-end">
        <Button type="submit" variant="gold" disabled={saving} className="w-full rounded-full px-6 sm:w-auto">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save settings
        </Button>
      </div>
    </form>
  )
}
