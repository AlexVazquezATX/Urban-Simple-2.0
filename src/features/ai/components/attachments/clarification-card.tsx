'use client'

import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProposedClarification } from '../../types/action-types'

interface ClarificationCardProps {
  data: ProposedClarification
}

/**
 * Renders the choice buttons for an LLM-asked clarification. The question
 * itself is already shown as the assistant message content; this card only
 * adds quick-pick buttons. Clicking a button dispatches a CustomEvent the
 * chat sidebar listens for to re-submit the chosen label as the next user
 * message.
 */
export function ClarificationCard({ data }: ClarificationCardProps) {
  if (!data.choices || data.choices.length === 0) return null

  const handleClick = (label: string) => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent('ai-chat-prompt', { detail: { text: label } })
    )
  }

  return (
    <div className="rounded-sm border border-border bg-secondary/60 p-2">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <HelpCircle className="h-3 w-3" /> Quick choices
      </p>
      <div className="flex flex-wrap gap-2">
        {data.choices.map((c) => (
          <Button
            key={c.id}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto rounded-sm px-2 py-1 text-xs"
            onClick={() => handleClick(c.label)}
          >
            <span className="font-medium">{c.label}</span>
            {c.hint && (
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                {c.hint}
              </span>
            )}
          </Button>
        ))}
      </div>
    </div>
  )
}
