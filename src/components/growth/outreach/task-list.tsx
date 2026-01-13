'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, MessageSquare, Linkedin, Instagram, Clock, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface TaskListProps {
  tasks: any[]
  scheduledMessages: any[]
}

export function TaskList({ tasks, scheduledMessages }: TaskListProps) {
  const getChannelIcon = (channel: string) => {
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
        return <Clock className="h-4 w-4" />
    }
  }

  const allTasks = [
    ...scheduledMessages.map((m) => ({
      id: m.id,
      type: 'scheduled',
      prospectId: m.prospectId,
      prospectName: m.prospectName,
      channel: m.channel,
      subject: m.subject,
      scheduledAt: m.scheduledAt,
      campaignName: m.campaignName,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      type: 'follow_up',
      prospectId: t.prospectId,
      prospectName: t.prospect?.companyName || 'Unknown',
      channel: t.channel,
      subject: t.title || undefined,
      scheduledAt: t.scheduledAt,
    })),
  ].sort((a, b) => {
    const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0
    const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0
    return aTime - bTime
  })

  if (allTasks.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No tasks scheduled for today</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {allTasks.slice(0, 10).map((task) => (
        <Link
          key={task.id}
          href={`/growth/prospects/${task.prospectId}`}
          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <div className="mt-0.5">
            {getChannelIcon(task.channel || 'email')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-sm truncate">{task.prospectName}</p>
              <Badge variant="outline" className="text-xs">
                {task.type === 'scheduled' ? 'Scheduled' : 'Follow-up'}
              </Badge>
            </div>
            {task.subject && (
              <p className="text-xs text-muted-foreground truncate">{task.subject}</p>
            )}
            {task.scheduledAt && (
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(task.scheduledAt), 'h:mm a')}
              </p>
            )}
            {task.campaignName && (
              <p className="text-xs text-muted-foreground mt-1">
                From: {task.campaignName}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
