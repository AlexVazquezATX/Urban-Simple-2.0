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
        return <Mail className="h-3.5 w-3.5 text-ocean-500" />
      case 'sms':
        return <MessageSquare className="h-3.5 w-3.5 text-lime-600" />
      case 'linkedin':
        return <Linkedin className="h-3.5 w-3.5 text-ocean-600" />
      case 'instagram':
      case 'instagram_dm':
        return <Instagram className="h-3.5 w-3.5 text-plum-500" />
      default:
        return <Clock className="h-3.5 w-3.5 text-warm-500" />
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
      campaignName: undefined,
    })),
  ].sort((a, b) => {
    const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0
    const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0
    return aTime - bTime
  })

  if (allTasks.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-10 w-10 text-warm-300 mx-auto mb-2" />
        <p className="text-sm text-warm-500">No tasks scheduled for today</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {allTasks.slice(0, 10).map((task) => (
        <Link
          key={task.id}
          href={`/growth/prospects/${task.prospectId}`}
          className="flex items-start gap-3 px-3 py-2.5 rounded-sm border border-warm-200 hover:border-ocean-400 transition-colors"
        >
          <div className="mt-0.5 w-6 h-6 rounded-sm bg-warm-100 flex items-center justify-center flex-shrink-0">
            {getChannelIcon(task.channel || 'email')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-sm font-medium text-warm-900 truncate">{task.prospectName}</p>
              <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300">
                {task.type === 'scheduled' ? 'Scheduled' : 'Follow-up'}
              </Badge>
            </div>
            {task.subject && (
              <p className="text-xs text-warm-500 truncate">{task.subject}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {task.scheduledAt && (
                <span className="text-[10px] text-warm-400">
                  {format(new Date(task.scheduledAt), 'h:mm a')}
                </span>
              )}
              {task.campaignName && (
                <>
                  <span className="text-[10px] text-warm-300">•</span>
                  <span className="text-[10px] text-warm-400">
                    {task.campaignName}
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
