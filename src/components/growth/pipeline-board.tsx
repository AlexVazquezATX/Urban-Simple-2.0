'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, DollarSign, MoreVertical, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

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
      <div className="flex gap-3 pb-4 min-w-max">
        {PIPELINE_STAGES.map((stage) => {
          const stageProspects = prospectsByStage[stage.id] || []
          const isWon = stage.id === 'won'
          const isLost = stage.id === 'lost'

          return (
            <div key={stage.id} className="w-60 flex-shrink-0 flex flex-col">
              {/* Column Header */}
              <div
                className={`
                  flex items-center justify-between px-3 py-2 rounded-t-sm border border-b-0
                  ${
                    isWon
                      ? 'bg-lime-100 border-lime-200'
                      : isLost
                      ? 'bg-warm-200 border-warm-300'
                      : 'bg-warm-100 border-warm-200'
                  }
                `}
              >
                <span
                  className={`
                    text-[10px] font-semibold uppercase tracking-wide
                    ${
                      isWon
                        ? 'text-lime-700'
                        : isLost
                        ? 'text-warm-600'
                        : 'text-warm-700'
                    }
                  `}
                >
                  {stage.label}
                </span>
                <span
                  className={`
                    text-[10px] font-medium px-1.5 py-0.5 rounded-sm
                    ${
                      isWon
                        ? 'bg-lime-200 text-lime-700'
                        : isLost
                        ? 'bg-warm-300 text-warm-600'
                        : 'bg-warm-200 text-warm-700'
                    }
                  `}
                >
                  {stageProspects.length}
                </span>
              </div>

              {/* Droppable Column */}
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`
                      rounded-b-sm border border-t-0 p-2 space-y-1.5 min-h-80 max-h-[calc(100vh-280px)] overflow-y-auto
                      ${
                        isWon
                          ? 'bg-lime-50/50 border-lime-200'
                          : isLost
                          ? 'bg-warm-100/50 border-warm-300'
                          : 'bg-warm-50 border-warm-200'
                      }
                      ${snapshot.isDraggingOver ? 'bg-ocean-50' : ''}
                    `}
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
                              className={`
                                transition-all duration-200 cursor-grab active:cursor-grabbing rounded-sm border-warm-200 hover:border-ocean-400 bg-white
                                ${snapshot.isDragging ? 'shadow-lg rotate-1' : ''}
                              `}
                            >
                              <CardContent className="p-2.5">
                                <div className="flex items-start gap-2">
                                  <div className="w-7 h-7 rounded-sm bg-warm-100 flex items-center justify-center flex-shrink-0">
                                    <Building2 className="h-3.5 w-3.5 text-warm-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <Link href={`/growth/prospects/${prospect.id}`}>
                                      <h4 className="text-xs font-medium text-warm-900 truncate hover:text-ocean-600">
                                        {prospect.companyName}
                                      </h4>
                                    </Link>
                                    {prospect.contacts && prospect.contacts.length > 0 && (
                                      <p className="text-[10px] text-warm-500 truncate mt-0.5">
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
                                        className="h-5 w-5 p-0 text-warm-400 hover:text-warm-700"
                                      >
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-sm">
                                      <DropdownMenuItem
                                        onClick={() => router.push(`/growth/prospects/${prospect.id}`)}
                                        className="text-xs"
                                      >
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleRemoveFromPipeline(prospect.id)}
                                        className="text-xs text-red-600"
                                      >
                                        <ArrowLeft className="mr-1.5 h-3 w-3" />
                                        Remove from Pipeline
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                {(prospect.estimatedValue || prospect.priority) && (
                                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-warm-100">
                                    {prospect.estimatedValue && (
                                      <span className="text-[10px] text-warm-600 flex items-center gap-0.5">
                                        <DollarSign className="h-2.5 w-2.5" />
                                        {Number(prospect.estimatedValue).toLocaleString()}
                                      </span>
                                    )}
                                    {prospect.priority && prospect.priority !== 'medium' && (
                                      <span
                                        className={`text-[10px] font-medium px-1 py-0 rounded-sm ${
                                          prospect.priority === 'urgent'
                                            ? 'bg-red-100 text-red-700'
                                            : prospect.priority === 'high'
                                            ? 'bg-plum-100 text-plum-700'
                                            : 'bg-warm-100 text-warm-600'
                                        }`}
                                      >
                                        {prospect.priority}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {stageProspects.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-6 text-warm-400">
                        <div className="w-8 h-8 rounded-sm bg-warm-100 flex items-center justify-center mb-1.5">
                          <Building2 className="h-4 w-4 text-warm-300" />
                        </div>
                        <span className="text-[10px]">No prospects</span>
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
