'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Loader2, Search } from 'lucide-react'

interface ProspectSelectorProps {
  value: string
  onValueChange: (value: string) => void
}

export function ProspectSelector({ value, onValueChange }: ProspectSelectorProps) {
  const [prospects, setProspects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchProspects()
  }, [])

  const fetchProspects = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/growth/prospects')
      if (response.ok) {
        const data = await response.json()
        setProspects(data || [])
      }
    } catch (error) {
      console.error('Error fetching prospects:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProspects = prospects.filter((p) =>
    p.companyName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select a prospect..." />
        </SelectTrigger>
        <SelectContent>
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : filteredProspects.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No prospects found
            </div>
          ) : (
            <>
              <div className="px-2 pb-2">
                <Input
                  placeholder="Search prospects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8"
                />
              </div>
              {filteredProspects.slice(0, 50).map((prospect) => (
                <SelectItem key={prospect.id} value={prospect.id}>
                  {prospect.companyName}
                  {prospect.status && (
                    <span className="text-muted-foreground ml-2">({prospect.status})</span>
                  )}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
