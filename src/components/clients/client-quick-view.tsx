'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DetailSheet, SheetSection, SheetField } from '@/components/ui/detail-sheet'
import { marginToneClass } from './margin-tone'
import { formatMargin } from '@/lib/financials'
import { formatMoney } from '@/lib/format'

function addressToString(address: any): string {
  if (!address) return ''
  if (typeof address === 'string') return address
  return `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim()
}

interface ClientQuickViewProps {
  client: any // list-row summary — renders the header instantly
  showFinancials?: boolean
  position?: number
  total?: number
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}

export function ClientQuickView({
  client,
  showFinancials = false,
  position,
  total,
  onClose,
  onPrev,
  onNext,
}: ClientQuickViewProps) {
  // Detail (contacts, full locations, counts) is fetched lazily; the header
  // + financials render immediately from the list-row summary.
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setDetail(null)
    fetch(`/api/clients/${client.id}`)
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
  }, [client.id])

  const addressStr = addressToString(client.address)
  const fin = client.financials
  const contacts = detail?.contacts ?? []
  const locations = detail?.locations ?? []
  const counts = detail?._count

  const identity = (
    <div className="flex items-start gap-3">
      {client.logoUrl ? (
        <div className="relative size-12 shrink-0 overflow-hidden rounded-[11px] bg-secondary">
          <Image src={client.logoUrl} alt={client.name} fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="grid size-12 shrink-0 place-items-center rounded-[11px] bg-secondary">
          <span className="font-display text-lg font-bold text-muted-foreground">
            {client.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-display text-xl font-bold tracking-[-0.4px] text-foreground">
          {client.name}
        </h2>
        {client.legalName && (
          <p className="truncate text-xs text-muted-foreground">{client.legalName}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant={client.status === 'active' ? 'green' : 'neutral'}>{client.status}</Badge>
          {client.branch?.code && <Badge variant="neutral">{client.branch.code}</Badge>}
          {client.paymentTerms && <Badge variant="neutral">{client.paymentTerms}</Badge>}
          {client.parentClient && (
            <Badge variant="neutral">↑ {client.parentClient.name}</Badge>
          )}
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
      fullHref={`/clients/${client.id}`}
      identity={identity}
    >
      {/* Financials — instant from the summary */}
      {showFinancials && fin && fin.agreementCount > 0 && (
        <div className="grid grid-cols-3 gap-2.5 rounded-[12px] border border-border bg-secondary/40 p-3">
          <div>
            <p className="kicker text-muted-foreground">MRR</p>
            <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
              {formatMoney(fin.monthlyRevenue)}
            </p>
          </div>
          <div>
            <p className="kicker text-muted-foreground">Profit</p>
            <p className={`mt-1 font-mono text-sm font-semibold tabular-nums ${marginToneClass(fin.marginPct)}`}>
              {formatMoney(fin.monthlyProfit)}
            </p>
          </div>
          <div>
            <p className="kicker text-muted-foreground">Margin</p>
            <p className={`mt-1 font-mono text-sm font-semibold tabular-nums ${marginToneClass(fin.marginPct)}`}>
              {formatMargin(fin.marginPct)}
            </p>
          </div>
        </div>
      )}

      {/* Client info — instant from the summary */}
      <SheetSection title="Client info">
        <div className="grid grid-cols-2 gap-3 rounded-[12px] border border-border p-3.5">
          <SheetField label="Billing email">
            {client.billingEmail ? (
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted-foreground" />
                <span className="truncate">{client.billingEmail}</span>
              </span>
            ) : null}
          </SheetField>
          <SheetField label="Phone">
            {client.phone ? (
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5 text-muted-foreground" />
                {client.phone}
              </span>
            ) : null}
          </SheetField>
          <SheetField label="Address">
            {addressStr ? (
              <span className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span>{addressStr}</span>
              </span>
            ) : null}
          </SheetField>
          <SheetField label="Payment terms">{client.paymentTerms}</SheetField>
        </div>
      </SheetSection>

      {/* Contacts — fetched */}
      <SheetSection title="Contacts" count={loading ? undefined : contacts.length}>
        {loading ? (
          <SheetLoading />
        ) : contacts.length === 0 ? (
          <SheetEmpty icon={User} text="No contacts yet." />
        ) : (
          <div className="space-y-2">
            {contacts.map((c: any) => (
              <div
                key={c.id}
                className="flex items-start justify-between rounded-[10px] border border-border p-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {c.firstName} {c.lastName}
                    </p>
                    {c.role && <Badge variant="neutral" className="capitalize">{c.role}</Badge>}
                    {c.isPortalUser && <Badge variant="teal">Portal</Badge>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {c.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="size-3" />
                        {c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="size-3" />
                        {c.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SheetSection>

      {/* Locations — fetched */}
      <SheetSection title="Locations" count={loading ? undefined : locations.length}>
        {loading ? (
          <SheetLoading />
        ) : locations.length === 0 ? (
          <SheetEmpty icon={MapPin} text="No locations yet." />
        ) : (
          <div className="space-y-2">
            {locations.map((loc: any) => (
              <Link
                key={loc.id}
                href={`/locations/${loc.id}`}
                className="flex items-center gap-3 rounded-[10px] border border-border p-2.5 transition-colors hover:border-primary/40 hover:bg-secondary/40"
              >
                <div className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-secondary">
                  <Building2 className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{loc.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {addressToString(loc.address) || loc.branch?.code || '—'}
                  </p>
                </div>
                {loc._count?.serviceAgreements > 0 && (
                  <Badge variant="neutral">
                    {loc._count.serviceAgreements} active
                  </Badge>
                )}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </SheetSection>

      {/* Quick stats — fetched counts */}
      {counts && (
        <SheetSection title="Quick stats">
          <div className="grid grid-cols-3 gap-2.5">
            <QuickStat label="Invoices" value={counts.invoices} />
            <QuickStat label="Payments" value={counts.payments} />
            <QuickStat label="Open issues" value={counts.issues} tone={counts.issues > 0 ? 'coral' : 'neutral'} />
          </div>
        </SheetSection>
      )}
    </DetailSheet>
  )
}

function QuickStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'coral'
}) {
  return (
    <div className="rounded-[10px] border border-border p-3 text-center">
      <p
        className={`font-display text-xl font-bold tabular-nums ${
          tone === 'coral' ? 'text-coral-600 dark:text-coral-300' : 'text-foreground'
        }`}
      >
        {value}
      </p>
      <p className="kicker mt-0.5 text-muted-foreground">{label}</p>
    </div>
  )
}

function SheetLoading() {
  return (
    <div className="flex items-center justify-center rounded-[10px] border border-border py-6 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
    </div>
  )
}

function SheetEmpty({ icon: Icon, text }: { icon: typeof User; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
      <Icon className="size-4" />
      {text}
    </div>
  )
}
