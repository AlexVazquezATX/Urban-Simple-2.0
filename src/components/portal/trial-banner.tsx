import Link from 'next/link'
import { Sparkles, AlertCircle } from 'lucide-react'

interface TrialBannerProps {
  trialEndsAt: Date
  status: string | null
}

// Banner shown to self-serve portal clients during their trial. Counts down
// the days remaining and links to (eventually) a billing page. After the
// trial expires it shifts to a "trial ended" state.
export function TrialBanner({ trialEndsAt, status }: TrialBannerProps) {
  const now = new Date()
  const msPerDay = 24 * 60 * 60 * 1000
  const daysLeft = Math.ceil((trialEndsAt.getTime() - now.getTime()) / msPerDay)
  const expired = daysLeft <= 0 || status === 'past_due' || status === 'cancelled'

  if (expired) {
    return (
      <div className="rounded-2xl border border-peach-line bg-peach-bg px-4 py-3.5">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-peach-deep" />
          <div className="flex-1 text-peach-deep">
            <p className="text-sm font-semibold">Your free trial has ended.</p>
            <p className="mt-0.5 text-xs">
              Pick a plan to keep your team and history.{' '}
              <a
                href="mailto:hello@urbansimple.net"
                className="font-semibold underline hover:no-underline"
              >
                Contact us
              </a>{' '}
              to upgrade.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gold-600/30 bg-gold-600/10 px-4 py-3.5">
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            Free trial · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
          </p>
          <p className="mt-0.5 text-xs text-cream-700">
            Keep building your inspection trail. No credit card needed during your trial.
          </p>
        </div>
        <Link
          href="/for-hospitality#pricing"
          className="shrink-0 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-secondary/60"
        >
          See plans
        </Link>
      </div>
    </div>
  )
}
