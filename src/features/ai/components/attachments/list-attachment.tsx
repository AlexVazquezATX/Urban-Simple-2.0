'use client'

import { Card } from '@/components/ui/card'
import Link from 'next/link'
import type { ListAttachment } from '../../types/ai-types'

interface ListAttachmentProps {
  attachment: ListAttachment
}

export function ListAttachmentComponent({ attachment }: ListAttachmentProps) {
  const { title, items } = attachment.data

  return (
    <Card className="p-4 mt-2">
      <h4 className="text-sm font-semibold mb-3">{title}</h4>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between py-2 border-b last:border-b-0"
          >
            <span className="text-sm text-muted-foreground">{item.label}</span>
            {item.link ? (
              <Link
                href={item.link}
                className="text-sm font-medium text-primary hover:underline"
              >
                {item.value}
              </Link>
            ) : (
              <span className="text-sm font-medium">{item.value}</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
