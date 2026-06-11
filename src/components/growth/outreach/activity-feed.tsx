'use client'

import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Mail, MessageSquare, Linkedin, Instagram, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface ActivityFeedProps {
  activities: any[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getChannelIcon = (channel: string, type: string) => {
    if (type === 'status_change') {
      return <Clock className="size-3.5 text-muted-foreground" />
    }
    switch (channel) {
      case 'email':
        return <Mail className="size-3.5 text-muted-foreground" />
      case 'sms':
        return <MessageSquare className="size-3.5 text-muted-foreground" />
      case 'linkedin':
        return <Linkedin className="size-3.5 text-muted-foreground" />
      case 'instagram':
      case 'instagram_dm':
        return <Instagram className="size-3.5 text-muted-foreground" />
      default:
        return <MessageSquare className="size-3.5 text-muted-foreground" />
    }
  }

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'interested':
        return <Badge variant="green">Interested</Badge>
      case 'follow_up':
        return <Badge variant="neutral">Follow-up</Badge>
      case 'not_interested':
        return <Badge variant="coral">Not Interested</Badge>
      default:
        return null
    }
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="All quiet for now"
        description="Outreach activity will show up here as messages go out and prospects respond."
        className="py-8"
      />
    )
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <Link
          key={activity.id}
          href={`/growth/prospects/${activity.prospectId}`}
          className="flex items-start gap-3 rounded-[12px] border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/40"
        >
          <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-[8px] bg-secondary">
            {getChannelIcon(activity.channel || activity.type, activity.type)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{activity.prospectName}</p>
                {activity.title && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{activity.title}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {activity.openedAt && <Badge variant="teal">Opened</Badge>}
                {activity.clickedAt && <Badge variant="gold">Clicked</Badge>}
                {getOutcomeBadge(activity.outcome)}
              </div>
            </div>
            {activity.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {activity.description}
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-2">
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </span>
              {activity.user && (
                <>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground">
                    {activity.user.firstName} {activity.user.lastName}
                  </span>
                </>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
