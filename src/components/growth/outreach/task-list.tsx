'use client'

import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
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
        return <Mail className="size-3.5 text-muted-foreground" />
      case 'sms':
        return <MessageSquare className="size-3.5 text-muted-foreground" />
      case 'linkedin':
        return <Linkedin className="size-3.5 text-muted-foreground" />
      case 'instagram':
      case 'instagram_dm':
        return <Instagram className="size-3.5 text-muted-foreground" />
      default:
        return <Clock className="size-3.5 text-muted-foreground" />
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
      <EmptyState
        icon={CheckCircle2}
        title="No tasks today — the queue is clear"
        description="Scheduled messages and follow-ups for today will show up here."
        className="py-8"
      />
    )
  }

  return (
    <div className="space-y-2">
      {allTasks.slice(0, 10).map((task) => (
        <Link
          key={task.id}
          href={`/growth/prospects/${task.prospectId}`}
          className="flex items-start gap-3 rounded-[12px] border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/40"
        >
          <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-[8px] bg-secondary">
            {getChannelIcon(task.channel || 'email')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-1.5">
              <p className="truncate text-sm font-medium text-foreground">{task.prospectName}</p>
              <Badge variant={task.type === 'scheduled' ? 'teal' : 'neutral'}>
                {task.type === 'scheduled' ? 'Scheduled' : 'Follow-up'}
              </Badge>
            </div>
            {task.subject && (
              <p className="truncate text-xs text-muted-foreground">{task.subject}</p>
            )}
            <div className="mt-1 flex items-center gap-2">
              {task.scheduledAt && (
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {format(new Date(task.scheduledAt), 'h:mm a')}
                </span>
              )}
              {task.campaignName && (
                <>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground">
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
