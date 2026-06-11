import Link from 'next/link'
import { ArrowRight, Mail, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoutButton } from '@/components/portal/logout-button'

// Shared building blocks for the LIVE client-portal surface
// (spec: docs/design-handoff/mockups/usp-live-core.jsx). The portal is its
// own surface: cream-50 background, 16-18px radii, pill buttons, pastel
// chips, light mode only. These render fine in both server and client
// components.

/* ---------------------------------- page ---------------------------------- */

// Centered inner-page column (920px; 1080px for the walkthrough capture grid).
export function LivePage({
  children,
  wide,
  className,
}: {
  children: React.ReactNode
  wide?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-5 pb-16 pt-8 md:px-10',
        wide ? 'max-w-[1080px]' : 'max-w-[920px]',
        className
      )}
    >
      {children}
    </div>
  )
}

// Lighter portal-voiced page head: mono gold kicker → display title → sub.
// (PageHeader is admin-flavored — this is its softer sibling.)
export function LivePageHead({
  kicker,
  title,
  sub,
  right,
}: {
  kicker: string
  title: string
  sub?: string
  right?: React.ReactNode
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end gap-5">
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10.5px] uppercase tracking-[2.4px] text-gold-600">
          {kicker}
        </div>
        <h1 className="mt-2.5 font-display text-[32px] font-bold leading-[1.05] tracking-[-1px] text-foreground">
          {title}
        </h1>
        {sub && (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-cream-700">{sub}</p>
        )}
      </div>
      {right}
    </div>
  )
}

/* ------------------------------- photo panel ------------------------------ */

// Left photo panel for the split layouts (home + login): full-height photo
// with gradient scrim, brand chip top-left, status pill bottom-left.
export function LivePhotoPanel({
  photoUrl,
  photoAlt,
  brandName,
  logoUrl,
  pill,
}: {
  photoUrl: string | null
  photoAlt: string
  brandName: string
  logoUrl?: string | null
  pill?: string
}) {
  return (
    <div className="relative hidden shrink-0 md:block md:w-[clamp(360px,42vw,640px)]">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={photoAlt}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        // Warm fallback when there's no proof-of-work photo yet.
        <div className="absolute inset-0 bg-gradient-to-br from-ink-800 via-ink-600 to-gold-900" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950/40 via-transparent to-ink-950/60" />

      {/* Brand chip */}
      <div className="pointer-events-none absolute left-8 top-7 flex items-center gap-3">
        <div className="grid h-[34px] w-[34px] place-items-center overflow-hidden rounded-full bg-cream-50/90 font-display text-sm font-extrabold text-ink-100">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={brandName} className="h-full w-full object-cover" />
          ) : (
            brandName.charAt(0)
          )}
        </div>
        <div>
          <div className="font-display text-[15px] font-bold tracking-[-0.2px] text-cream-50">
            {brandName}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[1.8px] text-cream-50/70">
            Urban Simple Portal
          </div>
        </div>
      </div>

      {/* Status pill */}
      {pill && (
        <div className="pointer-events-none absolute bottom-7 left-8 right-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-cream-50/25 bg-ink-950/55 px-4 py-2">
            <span className="h-[7px] w-[7px] rounded-full bg-green-300" />
            <span className="text-[12.5px] font-medium text-cream-50">{pill}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------- small parts ------------------------------ */

// Pastel stat tile (KITCHEN STATUS / NEXT VISIT).
const TILE_PALETTES = {
  sage: 'bg-sage-bg border-sage-line text-sage-deep',
  sky: 'bg-sky-bg border-sky-line text-sky-deep',
  peach: 'bg-peach-bg border-peach-line text-peach-deep',
  gold: 'bg-gold-600/10 border-gold-600/30 text-gold-600',
} as const

export function LiveStatTile({
  palette,
  label,
  value,
  sub,
}: {
  palette: keyof typeof TILE_PALETTES
  label: string
  value: string
  sub: string
}) {
  return (
    <div className={cn('flex-1 rounded-2xl border px-5 py-4', TILE_PALETTES[palette])}>
      <div className="font-mono text-[9.5px] uppercase tracking-[1.8px] opacity-75">{label}</div>
      <div className="mb-0.5 mt-2 font-display text-[21px] font-bold tracking-[-0.4px]">
        {value}
      </div>
      <div className="text-xs leading-snug opacity-85">{sub}</div>
    </div>
  )
}

// Action row: 40px gold-tinted icon circle + display title + arrow.
export function LiveActionRow({
  href,
  icon,
  title,
  sub,
}: {
  href: string
  icon: React.ReactNode
  title: string
  sub: string
}) {
  return (
    <Link href={href} className="group flex items-center gap-4 border-b border-border px-1 py-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-600/10 text-gold-600">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-base font-semibold tracking-[-0.2px] text-foreground">
          {title}
        </div>
        <div className="mt-px text-[12.5px] text-cream-700">{sub}</div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

// Timeline row: gold dot + mono time + 1px connector.
export function LiveTimelineRow({
  time,
  text,
  last,
}: {
  time: string
  text: string
  last?: boolean
}) {
  return (
    <div className="flex gap-4">
      <div className="flex w-2.5 flex-col items-center">
        <span className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-gold-600" />
        {!last && <span className="w-px flex-1 bg-border" />}
      </div>
      <div className={cn('flex items-baseline gap-3.5', !last && 'pb-4')}>
        <span className="w-16 shrink-0 font-mono text-[11.5px] text-muted-foreground">{time}</span>
        <span className="text-sm leading-relaxed text-foreground">{text}</span>
      </div>
    </div>
  )
}

// Manager footer: account-manager card + contact pill.
export function LiveManager({
  manager,
}: {
  manager: {
    firstName: string
    lastName: string
    phone: string | null
    avatarUrl: string | null
  } | null
}) {
  return (
    <div className="mt-auto flex items-center gap-3.5 pt-6">
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gold-600/10 font-display text-sm font-bold text-gold-600">
        {manager?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={manager.avatarUrl}
            alt={manager.firstName}
            className="h-full w-full object-cover"
          />
        ) : (
          (manager?.firstName.charAt(0) ?? 'U') + (manager ? '' : 'S')
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold text-foreground">
          {manager ? `${manager.firstName} · your account manager` : 'Urban Simple · your crew'}
        </div>
        <div className="text-xs text-muted-foreground">
          {manager
            ? 'Usually replies within the hour'
            : 'Your manager will appear here after your first visit'}
        </div>
      </div>
      {manager?.phone ? (
        <a
          href={`sms:${manager.phone}`}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-[18px] py-[9px] text-[13px] font-semibold text-foreground hover:bg-secondary/60"
        >
          <MessageCircle className="h-3.5 w-3.5 text-gold-600" />
          Text {manager.firstName}
        </a>
      ) : (
        <a
          href="mailto:hello@urbansimple.net"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-[18px] py-[9px] text-[13px] font-semibold text-foreground hover:bg-secondary/60"
        >
          <Mail className="h-3.5 w-3.5 text-gold-600" />
          Email us
        </a>
      )}
    </div>
  )
}

// Filter pill (month filter, issue-status filter): active = ink solid.
export function LiveFilterPill({
  href,
  active,
  children,
}: {
  href: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-full border px-[15px] py-[7px] text-[12.5px] whitespace-nowrap transition-colors',
        active
          ? 'border-foreground bg-foreground font-semibold text-cream-50'
          : 'border-border bg-card font-medium text-cream-700 hover:border-cream-500'
      )}
    >
      {children}
    </Link>
  )
}

// Portal-voiced empty state: gold-tinted icon circle + display title + warm line.
export function LiveEmpty({
  icon,
  title,
  sub,
  action,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-[18px] border border-border bg-card px-6 py-10 text-center shadow-soft">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-gold-600/10 text-gold-600">
        {icon}
      </div>
      <p className="mt-3 font-display text-[15px] font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">{sub}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

/* ------------------------------- home inline nav --------------------------- */

const HOME_LINKS: Array<[href: string, label: string]> = [
  ['/portal', 'Home'],
  ['/portal/walkthrough/new', 'Walkthrough'],
  ['/portal/cleaning-log', 'Log'],
  ['/portal/issues', 'Issues'],
  ['/portal/documents', 'Documents'],
  ['/portal/team', 'Team'],
]

// Inline nav for the home split layout (D · Quiet merge) — Home is always
// the active link here; inner pages use the sticky <LiveNav /> instead.
export function LiveHomeNav() {
  return (
    <div className="flex items-center gap-6">
      <nav className="flex min-w-0 flex-1 gap-6 overflow-x-auto">
        {HOME_LINKS.map(([href, label], i) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'whitespace-nowrap border-b-2 pb-1 text-[13px]',
              i === 0
                ? 'border-gold-600 font-semibold text-foreground'
                : 'border-transparent font-normal text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <LogoutButton />
    </div>
  )
}
