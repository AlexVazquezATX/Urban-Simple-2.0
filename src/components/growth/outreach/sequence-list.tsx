'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Play, Pause, Trash2, Loader2, Zap, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export function SequenceList() {
  const [sequences, setSequences] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSequences()
  }, [])

  const fetchSequences = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/growth/outreach/sequences')
      if (response.ok) {
        const data = await response.json()
        setSequences(data || [])
      }
    } catch (error) {
      console.error('Error fetching sequences:', error)
      toast.error('Failed to load sequences')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active'
      const response = await fetch(`/api/growth/outreach/sequences/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update')

      toast.success(`Sequence ${newStatus}`)
      fetchSequences()
    } catch (error) {
      toast.error('Failed to update sequence')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sequence?')) return

    try {
      const response = await fetch(`/api/growth/outreach/sequences/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast.success('Sequence deleted')
      fetchSequences()
    } catch (error) {
      toast.error('Failed to delete sequence')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="green">Active</Badge>
      case 'paused':
        return <Badge variant="neutral">Paused</Badge>
      case 'completed':
        return <Badge variant="neutral">Completed</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold tracking-[-0.2px] text-foreground">Automated Sequences</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Multi-step outreach campaigns that run automatically
          </p>
        </div>
        <Link href="/growth/outreach/sequences/new">
          <Button variant="gold">
            <Plus className="size-3.5" />
            New Sequence
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : sequences.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Zap}
              title="No sequences yet — put follow-up on autopilot"
              description="Build a multi-step campaign once and let it nurture prospects for you."
              action={
                <Link href="/growth/outreach/sequences/new">
                  <Button variant="outline">
                    <Plus className="size-3.5" />
                    Create Your First Sequence
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {sequences.map((sequence) => (
            <Card key={sequence.id} className="transition-colors hover:border-primary/40">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm">{sequence.name}</CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                      {sequence.description || 'No description'}
                    </CardDescription>
                  </div>
                  {getStatusBadge(sequence.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 font-mono text-xs tabular-nums text-muted-foreground">
                    <span>{sequence._count?.messages || 0} steps</span>
                    {sequence.startDate && (
                      <>
                        <span>·</span>
                        <span>
                          Started {new Date(sequence.startDate).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/growth/outreach/sequences/${sequence.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        View Details
                      </Button>
                    </Link>
                    {sequence.status !== 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(sequence.id, sequence.status)}
                        className="h-7 px-2 text-xs"
                      >
                        {sequence.status === 'active' ? (
                          <>
                            <Pause className="size-3" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="size-3" />
                            Resume
                          </>
                        )}
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          aria-label="More actions"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(sequence.id)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
