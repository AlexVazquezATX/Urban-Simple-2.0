'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check } from 'lucide-react'
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
  } = useForm<LeadFormInput>({
    resolver: zodResolver(leadFormSchema),
    mode: 'onBlur',
    defaultValues: {
      first_name: '',
      last_name: '',
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
        className="rounded-2xl border border-sage-200 bg-sage-50 p-8 text-center shadow-card"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sage-500 text-white">
          <Check className="h-6 w-6" aria-hidden />
        </div>
        <h3 className="font-display text-2xl font-semibold text-charcoal-900">Got it.</h3>
        <p className="mt-2 text-charcoal-700">
          Check your email for confirmation. Alex will follow up with a phone call during business hours.
        </p>
      </div>
    )
  }

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="relative rounded-2xl border border-cream-200 bg-white p-6 shadow-card sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          id={`${fieldIdBase}-first_name`}
          error={errors.first_name?.message}
          required
        >
          <input
            id={`${fieldIdBase}-first_name`}
            type="text"
            autoComplete="given-name"
            className={inputClass(!!errors.first_name)}
            {...register('first_name')}
          />
        </Field>

        <Field
          label="Last name"
          id={`${fieldIdBase}-last_name`}
          error={errors.last_name?.message}
          required
        >
          <input
            id={`${fieldIdBase}-last_name`}
            type="text"
            autoComplete="family-name"
            className={inputClass(!!errors.last_name)}
            {...register('last_name')}
          />
        </Field>

        <Field
          label="Business name"
          id={`${fieldIdBase}-business_name`}
          error={errors.business_name?.message}
          required
          className="sm:col-span-2"
        >
          <input
            id={`${fieldIdBase}-business_name`}
            type="text"
            autoComplete="organization"
            className={inputClass(!!errors.business_name)}
            {...register('business_name')}
          />
        </Field>

        <Field
          label="Business type"
          id={`${fieldIdBase}-business_type`}
          error={errors.business_type?.message}
          required
        >
          <select
            id={`${fieldIdBase}-business_type`}
            defaultValue=""
            className={inputClass(!!errors.business_type)}
            {...register('business_type')}
          >
            <option value="" disabled>
              Select one
            </option>
            {BUSINESS_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Location (neighborhood or ZIP)"
          id={`${fieldIdBase}-location`}
          error={errors.location?.message}
          required
        >
          <input
            id={`${fieldIdBase}-location`}
            type="text"
            autoComplete="address-level2"
            className={inputClass(!!errors.location)}
            {...register('location')}
          />
        </Field>

        <Field
          label="Approximate square footage"
          id={`${fieldIdBase}-square_footage_bucket`}
          error={errors.square_footage_bucket?.message}
          required
        >
          <select
            id={`${fieldIdBase}-square_footage_bucket`}
            defaultValue=""
            className={inputClass(!!errors.square_footage_bucket)}
            {...register('square_footage_bucket')}
          >
            <option value="" disabled>
              Select one
            </option>
            {SQUARE_FOOTAGE_BUCKETS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Current cleaning situation"
          id={`${fieldIdBase}-current_cleaning`}
          error={errors.current_cleaning?.message}
          required
        >
          <select
            id={`${fieldIdBase}-current_cleaning`}
            defaultValue=""
            className={inputClass(!!errors.current_cleaning)}
            {...register('current_cleaning')}
          >
            <option value="" disabled>
              Select one
            </option>
            {CURRENT_CLEANING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="When do you want to start?"
          id={`${fieldIdBase}-start_timing`}
          error={errors.start_timing?.message}
          required
        >
          <select
            id={`${fieldIdBase}-start_timing`}
            defaultValue=""
            className={inputClass(!!errors.start_timing)}
            {...register('start_timing')}
          >
            <option value="" disabled>
              Select one
            </option>
            {START_TIMING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Email"
          id={`${fieldIdBase}-email`}
          error={errors.email?.message}
          required
        >
          <input
            id={`${fieldIdBase}-email`}
            type="email"
            autoComplete="email"
            inputMode="email"
            className={inputClass(!!errors.email)}
            {...register('email')}
          />
        </Field>

        <Field
          label="Phone"
          id={`${fieldIdBase}-phone`}
          error={errors.phone?.message}
          required
        >
          <input
            id={`${fieldIdBase}-phone`}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            className={inputClass(!!errors.phone)}
            {...register('phone')}
          />
        </Field>

        <Field
          label="Anything we should know?"
          id={`${fieldIdBase}-notes`}
          error={errors.notes?.message}
          className="sm:col-span-2"
        >
          <textarea
            id={`${fieldIdBase}-notes`}
            rows={4}
            className={inputClass(!!errors.notes)}
            {...register('notes')}
          />
        </Field>

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
        className="mt-6 flex w-full min-h-[48px] items-center justify-center rounded-lg bg-charcoal-900 px-6 py-3 text-base font-semibold text-cream-50 shadow-card transition-colors hover:bg-charcoal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting
          ? 'Submitting...'
          : variant === 'final'
            ? 'Book my free walkthrough'
            : 'Request my free walkthrough'}
      </button>

      <p className="mt-3 text-center text-xs text-charcoal-500">
        By submitting, you agree to be contacted by Urban Simple LLC about your request.
      </p>
    </form>
  )
}

function Field({
  id,
  label,
  error,
  required,
  className,
  children,
}: {
  id: string
  label: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-charcoal-800"
      >
        {label}
        {required && <span className="ml-0.5 text-terracotta-600" aria-hidden>*</span>}
        {required && <span className="sr-only"> required</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-status-error">
          {error}
        </p>
      )}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return [
    'block w-full rounded-lg border bg-white px-3 py-2.5 text-base text-charcoal-900 placeholder:text-charcoal-400 shadow-soft focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors min-h-[44px]',
    hasError
      ? 'border-status-error focus:border-status-error focus:ring-status-error/30'
      : 'border-cream-300 focus:border-bronze-400 focus:ring-bronze-400/30',
  ].join(' ')
}
