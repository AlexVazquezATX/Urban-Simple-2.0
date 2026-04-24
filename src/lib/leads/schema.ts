import { z } from 'zod'

export const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar' },
  { value: 'coffee_shop', label: 'Coffee Shop' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'event_space', label: 'Event Space' },
  { value: 'multi_location', label: 'Multi-location group' },
  { value: 'other', label: 'Other F&B or hospitality' },
] as const

export const SQUARE_FOOTAGE_BUCKETS = [
  { value: 'under_2k', label: 'Under 2,000' },
  { value: '2k_5k', label: '2,000 to 5,000' },
  { value: '5k_10k', label: '5,000 to 10,000' },
  { value: '10k_25k', label: '10,000 to 25,000' },
  { value: '25k_plus', label: '25,000 or more' },
] as const

export const CURRENT_CLEANING_OPTIONS = [
  { value: 'in_house', label: 'Handled in-house' },
  { value: 'contractor', label: 'Another contractor' },
  { value: 'none', label: 'Nothing right now' },
  { value: 'between', label: 'Between providers' },
] as const

export const START_TIMING_OPTIONS = [
  { value: 'asap', label: 'ASAP' },
  { value: 'two_weeks', label: 'Within 2 weeks' },
  { value: 'one_month', label: 'Within a month' },
  { value: 'exploring', label: 'Just exploring' },
] as const

const businessTypeEnum = z.enum([
  'restaurant',
  'bar',
  'coffee_shop',
  'hotel',
  'event_space',
  'multi_location',
  'other',
])

const squareFootageEnum = z.enum([
  'under_2k',
  '2k_5k',
  '5k_10k',
  '10k_25k',
  '25k_plus',
])

const currentCleaningEnum = z.enum([
  'in_house',
  'contractor',
  'none',
  'between',
])

const startTimingEnum = z.enum([
  'asap',
  'two_weeks',
  'one_month',
  'exploring',
])

export const leadFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(160),
  business_name: z.string().trim().min(1, 'Business name is required').max(160),
  business_type: businessTypeEnum,
  location: z.string().trim().min(1, 'Location is required').max(120),
  square_footage_bucket: squareFootageEnum.optional().or(z.literal('')),
  current_cleaning: currentCleaningEnum.optional().or(z.literal('')),
  start_timing: startTimingEnum,
  email: z.string().trim().email('Enter a valid email').max(160),
  phone: z.string().trim().min(7, 'Enter a valid phone number').max(40),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  website: z.string().max(200).optional().or(z.literal('')),
  utm_source: z.string().max(200).optional().or(z.literal('')),
  utm_medium: z.string().max(200).optional().or(z.literal('')),
  utm_campaign: z.string().max(200).optional().or(z.literal('')),
  referrer: z.string().max(500).optional().or(z.literal('')),
})

export type LeadFormInput = z.infer<typeof leadFormSchema>

export type BusinessType = z.infer<typeof businessTypeEnum>
export type SquareFootageBucket = z.infer<typeof squareFootageEnum>
export type CurrentCleaning = z.infer<typeof currentCleaningEnum>
export type StartTiming = z.infer<typeof startTimingEnum>

export type LeadPayload = {
  source: 'urbansimple.net/walkthrough'
  submitted_at: string
  name: string
  business_name: string
  business_type: BusinessType
  location: string
  square_footage_bucket?: SquareFootageBucket
  current_cleaning?: CurrentCleaning
  start_timing: StartTiming
  email: string
  phone: string
  notes?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  referrer?: string
}

export function labelFor<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value
}
