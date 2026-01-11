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
        return <Badge className="bg-green-500">Active</Badge>
      case 'paused':
        return <Badge variant="outline">Paused</Badge>
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automated Sequences</h2>
          <p className="text-muted-foreground mt-1">
            Multi-step outreach campaigns that run automatically
          </p>
        </div>
        <Link href="/growth/outreach/sequences/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Sequence
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : sequences.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No sequences created yet</p>
            <Link href="/growth/outreach/sequences/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Sequence
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sequences.map((sequence) => (
            <Card key={sequence.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>{sequence.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {sequence.description || 'No description'}
                    </CardDescription>
                  </div>
                  {getStatusBadge(sequence.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{sequence._count?.messages || 0} steps</span>
                    {sequence.startDate && (
                      <span>
                        Started {new Date(sequence.startDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/growth/outreach/sequences/${sequence.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                    {sequence.status !== 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(sequence.id, sequence.status)}
                      >
                        {sequence.status === 'active' ? (
                          <>
                            <Pause className="h-3 w-3 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Resume
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(sequence.id)}
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
