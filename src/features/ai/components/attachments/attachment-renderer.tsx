'use client'

import type {
  MessageAttachment,
  ChartAttachment,
  TableAttachment,
  ActionAttachment,
  ListAttachment,
  ProposedActionAttachment,
  ClarificationAttachment,
} from '../../types/ai-types'
import { ChartAttachmentComponent } from './chart-attachment'
import { TableAttachmentComponent } from './table-attachment'
import { ActionAttachmentComponent } from './action-attachment'
import { ListAttachmentComponent } from './list-attachment'
import { ProposedActionCard } from './proposed-action-card'
import { ClarificationCard } from './clarification-card'

interface AttachmentRendererProps {
  attachments: MessageAttachment[]
}

export function AttachmentRenderer({ attachments }: AttachmentRendererProps) {
  if (!attachments || attachments.length === 0) {
    return null
  }

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment, idx) => {
        switch (attachment.type) {
          case 'chart':
            return (
              <ChartAttachmentComponent
                key={idx}
                attachment={attachment as ChartAttachment}
              />
            )
          case 'table':
            return (
              <TableAttachmentComponent
                key={idx}
                attachment={attachment as TableAttachment}
              />
            )
          case 'list':
            return (
              <ListAttachmentComponent
                key={idx}
                attachment={attachment as ListAttachment}
              />
            )
          case 'action':
            return (
              <ActionAttachmentComponent
                key={idx}
                attachment={attachment as ActionAttachment}
              />
            )
          case 'proposed_action': {
            const a = attachment as ProposedActionAttachment
            return (
              <ProposedActionCard
                key={idx}
                set={a.data.set}
                userPrompt={a.data.userPrompt}
              />
            )
          }
          case 'clarification': {
            const a = attachment as ClarificationAttachment
            return <ClarificationCard key={idx} data={a.data} />
          }
          default:
            return null
        }
      })}
    </div>
  )
}
