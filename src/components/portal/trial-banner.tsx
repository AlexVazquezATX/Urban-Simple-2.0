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
      <div className="rounded-sm border-2 border-amber-300 bg-amber-50 p-3">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">Your free trial has ended.</p>
            <p className="mt-0.5 text-xs text-amber-800">
              Pick a plan to keep your team and history.{' '}
              <a
                href="mailto:hello@urbansimple.net"
                className="font-medium text-amber-900 underline hover:no-underline"
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
    <div className="rounded-sm border border-lime-200 bg-gradient-to-br from-lime-50 to-cream-50 p-3">
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-lime-700" />
        <div className="flex-1">
          <p className="text-sm font-medium text-warm-900">
            Free trial · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
          </p>
          <p className="mt-0.5 text-xs text-warm-600">
            Keep building your inspection trail. No credit card needed during your trial.
          </p>
        </div>
        <Link
          href="/for-hospitality#pricing"
          className="shrink-0 rounded-sm border border-warm-300 bg-white px-2.5 py-1 text-[11px] font-medium text-warm-800 hover:border-warm-400"
        >
          See plans
        </Link>
      </div>
    </div>
  )
}
