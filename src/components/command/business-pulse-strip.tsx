import { Users, DollarSign, AlertTriangle, Calendar, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { StatCard } from '@/components/ui/stat-card'
import { formatMoney } from '@/lib/format'

interface PulseStripProps {
  totalClients: number
  arOutstanding: number
  thisMonthRevenue: number
  overdueCount: number
  pipelineValue: number
}

export function BusinessPulseStrip({
  totalClients,
  arOutstanding,
  thisMonthRevenue,
  overdueCount,
  pipelineValue,
}: PulseStripProps) {
  const metrics: Array<{
    label: string
    value: string
    icon: LucideIcon
    href: string
    tone?: 'neutral' | 'coral'
  }> = [
    {
      label: 'Clients',
      value: totalClients.toString(),
      icon: Users,
      href: '/clients',
    },
    {
      label: 'AR outstanding',
      value: formatMoney(arOutstanding),
      icon: DollarSign,
      href: '/money',
    },
    {
      label: 'This month',
      value: formatMoney(thisMonthRevenue),
      icon: Calendar,
      href: '/money',
    },
    {
      label: 'Overdue',
      value: overdueCount.toString(),
      icon: AlertTriangle,
      href: '/money',
      tone: overdueCount > 0 ? 'coral' : 'neutral',
    },
    {
      label: 'Pipeline',
      value: formatMoney(pipelineValue),
      icon: TrendingUp,
      href: '/pipeline',
    },
  ]

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {metrics.map((metric) => (
        <Link key={metric.label} href={metric.href} className="group">
          <StatCard
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
            tone={metric.tone}
            className="h-full transition-shadow group-hover:shadow-card dark:group-hover:border-ink-600"
          />
        </Link>
      ))}
    </div>
  )
}
