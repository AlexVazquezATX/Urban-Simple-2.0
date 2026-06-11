'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, MoreVertical, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/format'

const PIPELINE_STAGES = [
  { id: 'new', label: 'New' },
  { id: 'researching', label: 'Researching' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'engaged', label: 'Engaged' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal_sent', label: 'Proposal' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
]

// Chip mapping: urgent→coral · high (shown as "hot")→gold · everything quieter
// shows no chip (keeps the board quiet — no invented "cold" label).
function priorityChip(priority: string) {
  switch (priority) {
    case 'urgent':
      return <Badge variant="coral" className="uppercase tracking-wider">urgent</Badge>
    case 'high':
      return <Badge variant="gold" className="uppercase tracking-wider">hot</Badge>
    default:
      return null
  }
}

interface Prospect {
  id: string
  companyName: string
  status: string
  priority: string
  estimatedValue: number | null
  contacts: Array<{
    firstName: string
    lastName: string
  }>
}

interface PipelineBoardProps {
  initialProspects: Prospect[]
}

export function PipelineBoard({ initialProspects }: PipelineBoardProps) {
  const router = useRouter()
  const [prospects, setProspects] = useState(initialProspects)

  // Group prospects by status
  const prospectsByStage = prospects.reduce((acc, prospect) => {
    const stage = prospect.status
    if (!acc[stage]) {
      acc[stage] = []
    }
    acc[stage].push(prospect)
    return acc
  }, {} as Record<string, Prospect[]>)

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    // Dropped outside a valid droppable
    if (!destination) return

    // Dropped in the same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    const newStatus = destination.droppableId

    // Update locally first for immediate feedback
    setProspects(prev =>
      prev.map(p => (p.id === draggableId ? { ...p, status: newStatus } : p))
    )

    // Update on server
    try {
      const response = await fetch(`/api/growth/prospects/${draggableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update prospect')
      }

      toast.success('Prospect moved successfully')
    } catch (error) {
      // Revert on error
      setProspects(prev =>
        prev.map(p => (p.id === draggableId ? { ...p, status: source.droppableId } : p))
      )
      toast.error('Failed to move prospect')
    }
  }

  const handleRemoveFromPipeline = async (prospectId: string) => {
    try {
      const response = await fetch(`/api/growth/prospects/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'prospect' }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove from pipeline')
      }

      setProspects(prev => prev.filter(p => p.id !== prospectId))
      toast.success('Removed from pipeline')
    } catch (error) {
      toast.error('Failed to remove from pipeline')
    }
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex min-w-max gap-3 pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageProspects = prospectsByStage[stage.id] || []
          const isWon = stage.id === 'won'
          const isEmpty = stageProspects.length === 0

          return (
            <div key={stage.id} className="flex w-60 flex-shrink-0 flex-col">
              {/* Column Header */}
              <div className="mb-2 flex items-center justify-between px-1">
                <span
                  className={cn(
                    'kicker',
                    isWon ? 'text-green-600 dark:text-green-300' : 'text-muted-foreground'
                  )}
                >
                  {stage.label}
                </span>
                <Badge variant={isWon ? 'green' : 'neutral'} className="font-mono tabular-nums">
                  {stageProspects.length}
                </Badge>
              </div>

              {/* Droppable Column */}
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'max-h-[calc(100vh-280px)] min-h-80 space-y-2 overflow-y-auto rounded-[12px] p-2 transition-colors',
                      isEmpty && !snapshot.isDraggingOver
                        ? cn(
                            'border-2 border-dashed',
                            isWon
                              ? 'border-green-600/30 dark:border-green-300/25'
                              : 'border-border'
                          )
                        : isWon
                          ? 'border border-green-600/30 bg-green-600/10 dark:border-green-300/25 dark:bg-green-300/12'
                          : 'border border-border bg-secondary/40',
                      snapshot.isDraggingOver && 'border-primary/40 bg-primary/10'
                    )}
                  >
                    {stageProspects.map((prospect, index) => (
                      <Draggable key={prospect.id} draggableId={prospect.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <Card
                              className={cn(
                                'cursor-grab gap-0 rounded-[12px] border-border bg-card py-0 transition-all duration-200 active:cursor-grabbing hover:border-primary/40',
                                snapshot.isDragging && 'rotate-1 shadow-lg'
                              )}
                            >
                              <CardContent className="p-2.5">
                                <div className="flex items-start gap-2">
                                  <div className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-secondary">
                                    <Building2 className="size-3.5 text-muted-foreground" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <Link href={`/growth/prospects/${prospect.id}`}>
                                      <h4 className="truncate text-xs font-semibold text-foreground transition-colors hover:text-primary">
                                        {prospect.companyName}
                                      </h4>
                                    </Link>
                                    {prospect.contacts && prospect.contacts.length > 0 && (
                                      <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                                        {prospect.contacts[0].firstName}{' '}
                                        {prospect.contacts[0].lastName}
                                      </p>
                                    )}
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                      >
                                        <MoreVertical className="size-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => router.push(`/growth/prospects/${prospect.id}`)}
                                        className="text-xs"
                                      >
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleRemoveFromPipeline(prospect.id)}
                                        className="text-xs"
                                      >
                                        <ArrowLeft className="size-3.5" />
                                        Remove from Pipeline
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                {(prospect.estimatedValue ||
                                  (prospect.priority && prospect.priority !== 'medium')) && (
                                  <div className="mt-2 flex items-center justify-between gap-1.5 border-t border-border/60 pt-2">
                                    {prospect.estimatedValue ? (
                                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                                        {formatMoney(prospect.estimatedValue)}
                                      </span>
                                    ) : (
                                      <span />
                                    )}
                                    {prospect.priority &&
                                      prospect.priority !== 'medium' &&
                                      priorityChip(prospect.priority)}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {isEmpty && !snapshot.isDraggingOver && (
                      <div className="flex min-h-72 flex-col items-center justify-center text-center">
                        <span className="text-xs text-muted-foreground">
                          {isWon ? 'No wins yet' : 'No prospects yet'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
