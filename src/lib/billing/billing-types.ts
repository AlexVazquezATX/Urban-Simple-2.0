export interface FacilityLineItem {
  facilityProfileId: string
  locationName: string
  category: string | null
  effectiveStatus: string
  effectiveRate: number // full monthly rate
  effectiveFrequency: number
  effectiveDaysOfWeek: number[]
  isOverridden: boolean
  overrideNotes: string | null
  isSeasonallyPaused: boolean
  includedInTotal: boolean // false if paused/pending/closed
  taxBehavior: string
  lineItemTax: number
  lineItemTotal: number // pro-rated if date-range pause, else full rate (or 0)
  // Pro-rating fields (present when date-range pause applies)
  isProRated: boolean
  scheduledDays: number | null  // total days matching DOW in the month
  activeDays: number | null     // days after subtracting paused range
  pauseStartDay: number | null  // 1-31
  pauseEndDay: number | null    // 1-31
}

export interface BillingExplanation {
  activeFacilities: string[]
  pausedFacilities: string[]
  seasonallyPaused: string[]
  pendingApproval: string[]
  closedFacilities: string[]
  overrides: string[] // human-readable descriptions
  deltaAmount: number | null
  deltaReason: string | null
}

export interface ServiceLineItemData {
  id: string
  facilityProfileId: string | null
  locationName: string | null // resolved from facility → location
  description: string
  quantity: number
  unitRate: number
  lineItemTotal: number // quantity * unitRate
  taxBehavior: string
  lineItemTax: number
  notes: string | null
  performedDate: string | null
  status: string
}

export interface BillingPreview {
  clientId: string
  clientName: string
  year: number
  month: number
  monthLabel: string
  lineItems: FacilityLineItem[]
  serviceLineItems: ServiceLineItemData[]
  subtotal: number
  serviceSubtotal: number
  taxRate: number
  taxAmount: number
  total: number
  displayMode: string
  explanation: BillingExplanation
  previousMonthTotal: number | null
  activeFacilityCount: number
  totalFacilityCount: number
}
