'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronDown, Loader2, Send } from 'lucide-react'
import {
  BUSINESS_TYPES,
  CURRENT_CLEANING_OPTIONS,
  SQUARE_FOOTAGE_BUCKETS,
  START_TIMING_OPTIONS,
  leadFormSchema,
  type LeadFormInput,
} from '@/lib/leads/schema'

type UtmState = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  referrer?: string
}

function readUtms(): UtmState {
  if (typeof window === 'undefined') return {}
  try {
    const params = new URLSearchParams(window.location.search)
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      referrer: document.referrer || undefined,
    }
  } catch {
    return {}
  }
}

function fireLeadAnalytics() {
  if (typeof window === 'undefined') return
  try {
    const w = window as unknown as {
      fbq?: (...args: unknown[]) => void
      gtag?: (...args: unknown[]) => void
    }
    if (typeof w.fbq === 'function') {
      w.fbq('track', 'Lead')
    }
    if (typeof w.gtag === 'function') {
      w.gtag('event', 'generate_lead', {
        event_category: 'walkthrough',
        event_label: 'urbansimple.net/walkthrough',
      })
    }
  } catch (err) {
    console.error('[walkthrough] analytics fire failed', err)
  }
}

interface LeadFormProps {
  formId?: string
  variant?: 'hero' | 'final'
}

export function LeadForm({ formId = 'lead-form', variant = 'hero' }: LeadFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [utm, setUtm] = useState<UtmState>({})

  useEffect(() => {
    setUtm(readUtms())
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<LeadFormInput>({
    resolver: zodResolver(leadFormSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      business_name: '',
      business_type: undefined,
      location: '',
      square_footage_bucket: undefined,
      current_cleaning: undefined,
      start_timing: undefined,
      email: '',
      phone: '',
      notes: '',
      website: '',
    },
  })

  const onSubmit = async (values: LeadFormInput) => {
    setServerError(null)
    const payload = {
      ...values,
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      referrer: utm.referrer,
    }

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({ ok: false }))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Submission failed')
      }
      fireLeadAnalytics()
      setSubmitted(true)
    } catch (err) {
      console.error('[walkthrough] submit failed', err)
      setServerError(
        'Something went wrong submitting your request. Please try again or call us directly.',
      )
    }
  }

  const fieldIdBase = useMemo(() => formId, [formId])

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-sage-400/40 bg-sage-500/15 p-8 text-center backdrop-blur-xl"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sage-500 text-white shadow-lg">
          <Check className="h-7 w-7" aria-hidden />
        </div>
        <h3 className="font-display text-2xl font-semibold text-cream-50">Got it.</h3>
        <p className="mt-2 text-cream-200">
          A confirmation is on its way to your inbox. We will reach out by email or text shortly to lock in a time for your walkthrough.
        </p>
      </div>
    )
  }

  const submitLabel = variant === 'final' ? 'Book my free walkthrough' : 'Request my free walkthrough'

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="relative rounded-2xl border border-cream-50/15 bg-charcoal-950/60 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7"
    >
      <div className="mb-5 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-bronze-400" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cream-200">
          Tell us about your space
        </p>
      </div>

      <div className="space-y-3.5">
        <GlassInput
          id={`${fieldIdBase}-name`}
          label="Name"
          placeholder="Your name *"
          autoComplete="name"
          error={errors.name?.message}
          register={register('name')}
          required
        />

        <GlassInput
          id={`${fieldIdBase}-business_name`}
          label="Business name"
          placeholder="Business name *"
          autoComplete="organization"
          error={errors.business_name?.message}
          register={register('business_name')}
          required
        />

        <div className="grid gap-3.5 sm:grid-cols-2">
          <GlassSelect
            id={`${fieldIdBase}-business_type`}
            label="Business type"
            placeholder="Business type *"
            error={errors.business_type?.message}
            options={BUSINESS_TYPES}
            value={watch('business_type')}
            register={register('business_type')}
            required
          />
          <GlassInput
            id={`${fieldIdBase}-location`}
            label="Location"
            placeholder="Neighborhood or ZIP *"
            autoComplete="address-level2"
            error={errors.location?.message}
            register={register('location')}
            required
          />
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <GlassSelect
            id={`${fieldIdBase}-square_footage_bucket`}
            label="Approximate square footage"
            placeholder="Square footage (optional)"
            error={errors.square_footage_bucket?.message}
            options={SQUARE_FOOTAGE_BUCKETS}
            value={watch('square_footage_bucket')}
            register={register('square_footage_bucket')}
          />
          <GlassSelect
            id={`${fieldIdBase}-current_cleaning`}
            label="Current cleaning situation"
            placeholder="Current cleaning (optional)"
            error={errors.current_cleaning?.message}
            options={CURRENT_CLEANING_OPTIONS}
            value={watch('current_cleaning')}
            register={register('current_cleaning')}
          />
        </div>

        <GlassSelect
          id={`${fieldIdBase}-start_timing`}
          label="When do you want to start?"
          placeholder="When do you want to start? *"
          error={errors.start_timing?.message}
          options={START_TIMING_OPTIONS}
          value={watch('start_timing')}
          register={register('start_timing')}
          required
        />

        <div className="grid gap-3.5 sm:grid-cols-2">
          <GlassInput
            id={`${fieldIdBase}-email`}
            label="Email"
            placeholder="Email *"
            type="email"
            autoComplete="email"
            inputMode="email"
            error={errors.email?.message}
            register={register('email')}
            required
          />
          <GlassInput
            id={`${fieldIdBase}-phone`}
            label="Phone"
            placeholder="Phone *"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            error={errors.phone?.message}
            register={register('phone')}
            required
          />
        </div>

        <GlassTextarea
          id={`${fieldIdBase}-notes`}
          label="Anything we should know?"
          placeholder="Anything we should know? (optional)"
          error={errors.notes?.message}
          register={register('notes')}
        />

        <div
          aria-hidden="true"
          className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden"
        >
          <label htmlFor={`${fieldIdBase}-website`}>Website</label>
          <input
            id={`${fieldIdBase}-website`}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register('website')}
          />
        </div>
      </div>

      {serverError && (
        <p role="alert" className="mt-4 text-sm text-status-error">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="group mt-5 flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-700 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:from-ocean-600 hover:to-ocean-800 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean-300 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            {submitLabel}
          </>
        )}
      </button>

      <p className="mt-3 text-center text-xs text-cream-300/80">
        By submitting, you agree to be contacted by Urban Simple LLC about your request.
      </p>
    </form>
  )
}

type RegisterReturn = ReturnType<ReturnType<typeof useForm<LeadFormInput>>['register']>

const inputBaseClass =
  'block w-full rounded-xl border bg-cream-50/10 px-4 py-3 text-base text-cream-50 placeholder:text-cream-200/60 transition-all focus:outline-none focus:bg-cream-50/15 min-h-[48px]'

function stateClasses(hasError: boolean) {
  return hasError
    ? 'border-status-error/60 focus:border-status-error focus:ring-2 focus:ring-status-error/30'
    : 'border-cream-50/20 focus:border-ocean-400 focus:ring-2 focus:ring-ocean-400/30'
}

function GlassInput({
  id,
  label,
  placeholder,
  type = 'text',
  autoComplete,
  inputMode,
  error,
  register,
  required,
}: {
  id: string
  label: string
  placeholder: string
  type?: string
  autoComplete?: string
  inputMode?: 'email' | 'tel' | 'text' | 'numeric' | 'decimal' | 'search' | 'url' | 'none'
  error?: string
  register: RegisterReturn
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
        {required ? ' (required)' : ''}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className={`${inputBaseClass} ${stateClasses(!!error)}`}
        {...register}
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-status-error">
          {error}
        </p>
      )}
    </div>
  )
}

function GlassTextarea({
  id,
  label,
  placeholder,
  error,
  register,
}: {
  id: string
  label: string
  placeholder: string
  error?: string
  register: RegisterReturn
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        placeholder={placeholder}
        className={`${inputBaseClass} resize-none ${stateClasses(!!error)}`}
        {...register}
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-status-error">
          {error}
        </p>
      )}
    </div>
  )
}

function GlassSelect({
  id,
  label,
  placeholder,
  options,
  value,
  register,
  error,
  required,
}: {
  id: string
  label: string
  placeholder: string
  options: readonly { value: string; label: string }[]
  value: string | undefined
  register: RegisterReturn
  error?: string
  required?: boolean
}) {
  const hasValue = typeof value === 'string' && value.length > 0
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
        {required ? ' (required)' : ''}
      </label>
      <div className="relative">
        <select
          id={id}
          defaultValue=""
          className={`${inputBaseClass} appearance-none pr-10 ${stateClasses(!!error)} ${
            hasValue ? 'text-cream-50' : 'text-cream-200/60'
          }`}
          {...register}
        >
          <option value="" disabled className="bg-charcoal-900 text-cream-300">
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-charcoal-900 text-cream-50">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-200/70"
          aria-hidden
        />
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-status-error">
          {error}
        </p>
      )}
    </div>
  )
}
