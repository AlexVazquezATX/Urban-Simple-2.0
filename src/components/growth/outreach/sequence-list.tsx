'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Play, Pause, Trash2, Loader2, Zap } from 'lucide-react'
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
        return <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-lime-100 text-lime-700 border-lime-200">Active</Badge>
      case 'paused':
        return <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300">Paused</Badge>
      case 'completed':
        return <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-warm-100 text-warm-600 border-warm-200">Completed</Badge>
      default:
        return <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-medium text-warm-900">Automated Sequences</h2>
          <p className="text-sm text-warm-500 mt-0.5">
            Multi-step outreach campaigns that run automatically
          </p>
        </div>
        <Link href="/growth/outreach/sequences/new">
          <Button variant="lime" className="rounded-sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Sequence
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-warm-400" />
        </div>
      ) : sequences.length === 0 ? (
        <Card className="rounded-sm border-warm-200">
          <CardContent className="py-12 text-center">
            <Zap className="h-10 w-10 text-warm-300 mx-auto mb-3" />
            <p className="text-sm text-warm-500 mb-4">No sequences created yet</p>
            <Link href="/growth/outreach/sequences/new">
              <Button variant="lime" className="rounded-sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create Your First Sequence
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {sequences.map((sequence) => (
            <Card key={sequence.id} className="rounded-sm border-warm-200 hover:border-ocean-400 transition-colors">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-medium text-warm-900">{sequence.name}</CardTitle>
                    <CardDescription className="text-xs text-warm-500 mt-0.5">
                      {sequence.description || 'No description'}
                    </CardDescription>
                  </div>
                  {getStatusBadge(sequence.status)}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-warm-500">
                    <span>{sequence._count?.messages || 0} steps</span>
                    {sequence.startDate && (
                      <>
                        <span className="text-warm-300">•</span>
                        <span>
                          Started {new Date(sequence.startDate).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/growth/outreach/sequences/${sequence.id}`}>
                      <Button variant="outline" size="sm" className="rounded-sm h-7 px-2 text-xs">
                        View Details
                      </Button>
                    </Link>
                    {sequence.status !== 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(sequence.id, sequence.status)}
                        className="rounded-sm h-7 px-2 text-xs"
                      >
                        {sequence.status === 'active' ? (
                          <>
                            <Pause className="h-3 w-3 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1 text-lime-600" />
                            Resume
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(sequence.id)}
                      className="rounded-sm h-7 w-7 p-0 text-warm-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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
