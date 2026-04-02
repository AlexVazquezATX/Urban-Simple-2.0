import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, DollarSign, AlertTriangle, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'

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
  const metrics = [
    {
      label: 'Clients',
      value: totalClients.toString(),
      icon: Users,
      color: 'border-l-lime-500',
      iconColor: 'text-lime-600',
      href: '/clients',
    },
    {
      label: 'AR Outstanding',
      value: `$${arOutstanding.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'border-l-lime-500',
      iconColor: 'text-lime-600',
      href: '/money',
    },
    {
      label: 'This Month',
      value: `$${thisMonthRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: Calendar,
      color: 'border-l-ocean-500',
      iconColor: 'text-ocean-600',
      href: '/money',
    },
    {
      label: 'Overdue',
      value: overdueCount.toString(),
      icon: AlertTriangle,
      color: overdueCount > 0 ? 'border-l-destructive' : 'border-l-lime-500',
      iconColor: overdueCount > 0 ? 'text-destructive' : 'text-lime-600',
      href: '/money',
    },
    {
      label: 'Pipeline',
      value: `$${pipelineValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: TrendingUp,
      color: 'border-l-ocean-500',
      iconColor: 'text-ocean-600',
      href: '/pipeline',
    },
  ]

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <Link key={metric.label} href={metric.href}>
            <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900 border-l-4 hover:shadow-sm transition-shadow cursor-pointer" style={{ borderLeftColor: undefined }} >
              <div className={`rounded-sm border-l-4 ${metric.color}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
                  <CardTitle className="text-[10px] font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wide">
                    {metric.label}
                  </CardTitle>
                  <Icon className={`h-3.5 w-3.5 ${metric.iconColor}`} />
                </CardHeader>
                <CardContent className="pb-3 px-3">
                  <div className="text-xl font-semibold tracking-tight text-warm-900 dark:text-cream-100">
                    {metric.value}
                  </div>
                </CardContent>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
