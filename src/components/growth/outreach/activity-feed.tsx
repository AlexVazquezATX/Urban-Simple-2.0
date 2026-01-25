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
      return <Clock className="h-3.5 w-3.5 text-warm-500" />
    }
    switch (channel) {
      case 'email':
        return <Mail className="h-3.5 w-3.5 text-ocean-500" />
      case 'sms':
        return <MessageSquare className="h-3.5 w-3.5 text-lime-600" />
      case 'linkedin':
        return <Linkedin className="h-3.5 w-3.5 text-ocean-600" />
      case 'instagram':
      case 'instagram_dm':
        return <Instagram className="h-3.5 w-3.5 text-plum-500" />
      default:
        return <MessageSquare className="h-3.5 w-3.5 text-warm-500" />
    }
  }

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'interested':
        return <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-lime-100 text-lime-700 border-lime-200">Interested</Badge>
      case 'follow_up':
        return <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300">Follow-up</Badge>
      case 'not_interested':
        return <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200">Not Interested</Badge>
      default:
        return null
    }
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-10 w-10 mx-auto mb-2 text-warm-300" />
        <p className="text-sm text-warm-500">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {activities.map((activity) => (
        <Link
          key={activity.id}
          href={`/growth/prospects/${activity.prospectId}`}
          className="flex items-start gap-3 px-3 py-2.5 rounded-sm border border-warm-200 hover:border-ocean-400 transition-colors"
        >
          <div className="mt-0.5 w-6 h-6 rounded-sm bg-warm-100 flex items-center justify-center flex-shrink-0">
            {getChannelIcon(activity.channel || activity.type, activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-warm-900">{activity.prospectName}</p>
                {activity.title && (
                  <p className="text-xs text-warm-500 mt-0.5 truncate">{activity.title}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {activity.openedAt && (
                  <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-ocean-300 text-ocean-600">
                    Opened
                  </Badge>
                )}
                {activity.clickedAt && (
                  <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-lime-300 text-lime-600">
                    Clicked
                  </Badge>
                )}
                {getOutcomeBadge(activity.outcome)}
              </div>
            </div>
            {activity.description && (
              <p className="text-xs text-warm-500 line-clamp-2 mt-1">
                {activity.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-warm-400">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </span>
              {activity.user && (
                <>
                  <span className="text-[10px] text-warm-300">•</span>
                  <span className="text-[10px] text-warm-400">
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
