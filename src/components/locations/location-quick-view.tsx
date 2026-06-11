'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, MapPin, ClipboardList, Users, Loader2, UserCog } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DetailSheet, SheetSection, SheetField } from '@/components/ui/detail-sheet'
import { marginTone, reviewBadgeVariant } from './tones'
import { formatMargin } from '@/lib/financials'
import { formatMoney } from '@/lib/format'
import { formatServiceDays, normalizeServiceProfile } from '@/lib/operations/dispatch'
import { getReviewFreshness } from '@/lib/operations/review-freshness'

function addressToString(address: any): string {
  if (!address) return ''
  if (typeof address === 'string') return address
  return `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim()
}

function personName(u: any): string {
  if (!u) return ''
  return u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Unknown'
}

interface LocationQuickViewProps {
  location: any // list-row summary — renders the header instantly
  showFinancials?: boolean
  position?: number
  total?: number
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}

export function LocationQuickView({
  location,
  showFinancials = false,
  position,
  total,
  onClose,
  onPrev,
  onNext,
}: LocationQuickViewProps) {
  // Crew, manager, notes, and counts are fetched lazily; everything else
  // renders immediately from the list-row summary.
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setDetail(null)
    fetch(`/api/locations/${location.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active) setDetail(data)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [location.id])

  const addressStr = addressToString(location.address)
  const serviceProfile = normalizeServiceProfile(location.serviceProfile)
  const reviewFreshness = getReviewFreshness(location.reviews?.[0])
  const fin = location.financials
  const counts = detail?._count
  const assignments = detail?.assignments ?? []
  const manager = detail?.serviceProfile?.defaultManager
  const accessNotes = detail?.accessNotes
  const serviceNotes = detail?.serviceNotes

  const identity = (
    <div className="flex items-start gap-3">
      {location.logoUrl ? (
        <div className="relative size-12 shrink-0 overflow-hidden rounded-[11px] bg-secondary">
          <Image src={location.logoUrl} alt={location.name} fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="grid size-12 shrink-0 place-items-center rounded-[11px] bg-secondary">
          <Building2 className="size-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-display text-xl font-bold tracking-[-0.4px] text-foreground">
          {location.name}
        </h2>
        {location.client && (
          <Link
            href={`/clients/${location.client.id}`}
            className="truncate text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            {location.client.name}
          </Link>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant={location.isActive ? 'green' : 'neutral'}>
            {location.isActive ? 'active' : 'inactive'}
          </Badge>
          {location.branch?.code && <Badge variant="neutral">{location.branch.code}</Badge>}
          <Badge variant={reviewBadgeVariant(reviewFreshness)}>{reviewFreshness.shortLabel}</Badge>
        </div>
      </div>
    </div>
  )

  return (
    <DetailSheet
      onClose={onClose}
      onPrev={onPrev}
      onNext={onNext}
      position={position}
      total={total}
      fullHref={`/locations/${location.id}`}
      identity={identity}
    >
      {/* Financials — instant from the summary */}
      {showFinancials && fin && (
        <div className="grid grid-cols-3 gap-2.5 rounded-[12px] border border-border bg-secondary/40 p-3">
          <div>
            <p className="kicker text-muted-foreground">MRR</p>
            <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
              {formatMoney(fin.monthlyRevenue)}
            </p>
          </div>
          <div>
            <p className="kicker text-muted-foreground">Profit</p>
            <p className={`mt-1 font-mono text-sm font-semibold tabular-nums ${marginTone(fin.marginPct)}`}>
              {formatMoney(fin.monthlyProfit)}
            </p>
          </div>
          <div>
            <p className="kicker text-muted-foreground">Margin</p>
            <p className={`mt-1 font-mono text-sm font-semibold tabular-nums ${marginTone(fin.marginPct)}`}>
              {formatMargin(fin.marginPct)}
            </p>
          </div>
        </div>
      )}

      {/* Location info — instant from the summary */}
      <SheetSection title="Location info">
        <div className="grid grid-cols-2 gap-3 rounded-[12px] border border-border p-3.5">
          <SheetField label="Address">
            {addressStr ? (
              <span className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span>{addressStr}</span>
              </span>
            ) : null}
          </SheetField>
          <SheetField label="Checklist">
            {location.checklistTemplate?.name ? (
              <span className="flex items-center gap-1.5">
                <ClipboardList className="size-3.5 text-muted-foreground" />
                {location.checklistTemplate.name}
              </span>
            ) : null}
          </SheetField>
          <SheetField label="Dispatch">
            <span className="flex flex-col gap-1">
              <Badge variant="neutral" className="w-fit">
                {serviceProfile.autoSchedule ? 'Auto Route' : 'Manual'}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">
                {formatServiceDays(serviceProfile.serviceDays)}
              </span>
            </span>
          </SheetField>
          <SheetField label="Review status">
            <span className="flex flex-col gap-0.5">
              <span>{reviewFreshness.shortLabel}</span>
              <span className="text-xs text-muted-foreground">
                {reviewFreshness.reviewedOnLabel || 'Needs manager review photos'}
              </span>
            </span>
          </SheetField>
          {!loading && manager && (
            <SheetField label="Manager">
              <span className="flex items-center gap-1.5">
                <UserCog className="size-3.5 text-muted-foreground" />
                {personName(manager)}
              </span>
            </SheetField>
          )}
          {!loading && accessNotes && <SheetField label="Access">{accessNotes}</SheetField>}
          {!loading && serviceNotes && <SheetField label="Service notes">{serviceNotes}</SheetField>}
        </div>
      </SheetSection>

      {/* Crew — fetched */}
      <SheetSection title="Crew" count={loading ? undefined : assignments.length}>
        {loading ? (
          <div className="flex items-center justify-center rounded-[10px] border border-border py-6 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex items-center gap-2 rounded-[10px] border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            <Users className="size-4" />
            No crew assigned.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {assignments.map((a: any) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs text-foreground"
              >
                <span className="grid size-5 place-items-center rounded-full bg-secondary font-display text-[10px] font-bold text-muted-foreground">
                  {personName(a.user).charAt(0).toUpperCase()}
                </span>
                {personName(a.user)}
              </span>
            ))}
          </div>
        )}
      </SheetSection>

      {/* Quick stats — fetched counts (issue count falls back to the summary) */}
      <SheetSection title="Quick stats">
        <div className="grid grid-cols-3 gap-2.5">
          <QuickStat
            label="Open issues"
            value={counts?.issues ?? location._count?.issues ?? 0}
            tone={(counts?.issues ?? location._count?.issues ?? 0) > 0 ? 'coral' : 'neutral'}
          />
          <QuickStat label="Service logs" value={counts?.serviceLogs} loading={loading && !counts} />
          <QuickStat label="Agreements" value={counts?.serviceAgreements} loading={loading && !counts} />
        </div>
      </SheetSection>
    </DetailSheet>
  )
}

function QuickStat({
  label,
  value,
  tone = 'neutral',
  loading = false,
}: {
  label: string
  value?: number
  tone?: 'neutral' | 'coral'
  loading?: boolean
}) {
  return (
    <div className="rounded-[10px] border border-border p-3 text-center">
      <p
        className={`font-display text-xl font-bold tabular-nums ${
          tone === 'coral' ? 'text-coral-600 dark:text-coral-300' : 'text-foreground'
        }`}
      >
        {loading ? <span className="text-muted-foreground">·</span> : value ?? 0}
      </p>
      <p className="kicker mt-0.5 text-muted-foreground">{label}</p>
    </div>
  )
}
