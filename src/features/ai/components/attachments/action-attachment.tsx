'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { ActionAttachment } from '../../types/ai-types'

interface ActionAttachmentProps {
  attachment: ActionAttachment
}

export function ActionAttachmentComponent({ attachment }: ActionAttachmentProps) {
  const { label, href, variant = 'default' } = attachment.data

  return (
    <div className="mt-2">
      <Button asChild variant={variant} size="sm" className="w-full">
        <Link href={href}>{label}</Link>
      </Button>
    </div>
  )
}
