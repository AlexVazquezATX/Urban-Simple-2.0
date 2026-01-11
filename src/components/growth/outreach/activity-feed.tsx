'use client'

import { Badge } from '@/components/ui/badge'
import { Mail, MessageSquare, Linkedin, Instagram, CheckCircle2, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface ActivityFeedProps {
  activities: any[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getChannelIcon = (channel: string, type: string) => {
    if (type === 'status_change') {
      return <Clock className="h-4 w-4" />
    }
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'sms':
        return <MessageSquare className="h-4 w-4" />
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />
      case 'instagram':
      case 'instagram_dm':
        return <Instagram className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'interested':
        return <Badge variant="default" className="bg-green-500">Interested</Badge>
      case 'follow_up':
        return <Badge variant="outline">Follow-up</Badge>
      case 'not_interested':
        return <Badge variant="destructive">Not Interested</Badge>
      default:
        return null
    }
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <Link
          key={activity.id}
          href={`/growth/prospects/${activity.prospectId}`}
          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <div className="mt-0.5">
            {getChannelIcon(activity.channel || activity.type, activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1">
                <p className="font-medium text-sm">{activity.prospectName}</p>
                {activity.title && (
                  <p className="text-xs text-muted-foreground mt-0.5">{activity.title}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {activity.openedAt && (
                  <Badge variant="outline" className="text-xs">
                    Opened
                  </Badge>
                )}
                {activity.clickedAt && (
                  <Badge variant="outline" className="text-xs">
                    Clicked
                  </Badge>
                )}
                {getOutcomeBadge(activity.outcome)}
              </div>
            </div>
            {activity.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {activity.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </span>
              {activity.user && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
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
