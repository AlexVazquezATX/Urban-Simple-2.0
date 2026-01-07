'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  Upload,
  Mail,
  Phone,
  Sparkles,
  MoreHorizontal,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Settings2,
  Zap,
  Calendar,
  Users,
  Target,
  Eye,
  Trash2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Prospect {
  id: string
  companyName: string
  legalName?: string | null
  industry?: string | null
  businessType?: string | null
  status: string
  priority: string
  estimatedValue?: number | null
  source: string
  phone?: string | null
  website?: string | null
  address?: any
  aiEnriched?: boolean
  priceLevel?: string | null
  lastContactedAt?: string | null
  createdAt: string
  contacts: Array<{
    id: string
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
    title?: string | null
  }>
  assignedTo?: {
    id: string
    firstName: string
    lastName: string
  } | null
  _count: {
    activities: number
  }
}

interface ProspectsListClientProps {
  prospects: Prospect[]
}

type SortField = 'companyName' | 'status' | 'priority' | 'estimatedValue' | 'createdAt' | 'lastContactedAt'
type SortDirection = 'asc' | 'desc'

// Column definitions
const ALL_COLUMNS = [
  { id: 'companyName', label: 'Business Name', alwaysVisible: true },
  { id: 'contact', label: 'Contact', alwaysVisible: false },
  { id: 'status', label: 'Status', alwaysVisible: false },
  { id: 'businessType', label: 'Facility Type', alwaysVisible: false },
  { id: 'priceLevel', label: 'Price Level', alwaysVisible: false },
  { id: 'priority', label: 'Interest Level', alwaysVisible: false },
  { id: 'address', label: 'City', alwaysVisible: false },
  { id: 'email', label: 'Email', alwaysVisible: false },
  { id: 'phone', label: 'Phone', alwaysVisible: false },
  { id: 'estimatedValue', label: 'Value', alwaysVisible: false },
  { id: 'source', label: 'Source', alwaysVisible: false },
  { id: 'aiEnriched', label: 'Enriched', alwaysVisible: false },
  { id: 'actions', label: 'Actions', alwaysVisible: true },
]

const DEFAULT_VISIBLE_COLUMNS = [
  'companyName', 'contact', 'status', 'businessType', 'priceLevel', 'priority', 'address', 'email', 'estimatedValue', 'actions'
]

export function ProspectsListClient({ prospects: initialProspects }: ProspectsListClientProps) {
  const router = useRouter()
  const [prospects, setProspects] = useState(initialProspects)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [facilityFilter, setFacilityFilter] = useState<string>('all')
  const [priceLevelFilter, setPriceLevelFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isEnrichingBulk, setIsEnrichingBulk] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS)
  const [viewMode, setViewMode] = useState<'spreadsheet' | 'card'>('spreadsheet')

  // Calculate stats for tabs
  const stats = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    return {
      total: prospects.length,
      contactToday: prospects.filter(p => {
        if (!p.lastContactedAt) return false
        const lastContact = new Date(p.lastContactedAt)
        const daysSince = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
        return daysSince >= 7 && p.status !== 'won' && p.status !== 'lost'
      }).length,
      hotLeads: prospects.filter(p => p.priority === 'high' || p.priority === 'urgent').length,
      followUp: prospects.filter(p => p.status === 'contacted' || p.status === 'engaged').length,
    }
  }, [prospects])

  // Filter and sort prospects
  const filteredProspects = useMemo(() => {
    let filtered = prospects.filter((prospect) => {
      // Search filter
      const matchesSearch =
        prospect.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.legalName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prospect.contacts.some(
          (c) =>
            c.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )

      // Status filter
      const matchesStatus = statusFilter === 'all' || prospect.status === statusFilter

      // Source filter
      const matchesSource = sourceFilter === 'all' || prospect.source === sourceFilter

      // Priority filter
      const matchesPriority = priorityFilter === 'all' || prospect.priority === priorityFilter

      // Facility filter
      const matchesFacility = facilityFilter === 'all' || prospect.businessType === facilityFilter

      // Price Level filter
      const matchesPriceLevel = priceLevelFilter === 'all' || prospect.priceLevel === priceLevelFilter

      // Tab filter
      let matchesTab = true
      if (activeTab === 'contact_today') {
        const now = new Date()
        if (!prospect.lastContactedAt) {
          matchesTab = false
        } else {
          const lastContact = new Date(prospect.lastContactedAt)
          const daysSince = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
          matchesTab = daysSince >= 7 && prospect.status !== 'won' && prospect.status !== 'lost'
        }
      } else if (activeTab === 'hot_leads') {
        matchesTab = prospect.priority === 'high' || prospect.priority === 'urgent'
      } else if (activeTab === 'follow_up') {
        matchesTab = prospect.status === 'contacted' || prospect.status === 'engaged'
      }

      return matchesSearch && matchesStatus && matchesSource && matchesPriority && matchesFacility && matchesPriceLevel && matchesTab
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortField) {
        case 'companyName':
          aVal = a.companyName.toLowerCase()
          bVal = b.companyName.toLowerCase()
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          aVal = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
          bVal = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
          break
        case 'estimatedValue':
          aVal = Number(a.estimatedValue) || 0
          bVal = Number(b.estimatedValue) || 0
          break
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime()
          bVal = new Date(b.createdAt).getTime()
          break
        case 'lastContactedAt':
          aVal = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0
          bVal = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0
          break
        default:
          return 0
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [prospects, searchQuery, statusFilter, sourceFilter, priorityFilter, facilityFilter, priceLevelFilter, activeTab, sortField, sortDirection])

  // Get unique values for filters
  const uniqueSources = useMemo(() => {
    const sources = new Set(prospects.map(p => p.source))
    return Array.from(sources).sort()
  }, [prospects])

  const uniqueFacilities = useMemo(() => {
    const facilities = new Set(prospects.map(p => p.businessType).filter(Boolean))
    return Array.from(facilities).sort() as string[]
  }, [prospects])

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProspects.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProspects.map(p => p.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Bulk enrich handler
  const handleBulkEnrich = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select prospects to enrich')
      return
    }

    setIsEnrichingBulk(true)
    const ids = Array.from(selectedIds)
    let successCount = 0
    let failCount = 0

    for (const id of ids) {
      try {
        const response = await fetch(`/api/growth/prospects/${id}/enrich`, {
          method: 'POST',
        })

        if (response.ok) {
          const data = await response.json()
          // Update local state
          setProspects(prev => prev.map(p =>
            p.id === id ? { ...p, ...data.prospect, aiEnriched: true } : p
          ))
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        failCount++
      }
    }

    setIsEnrichingBulk(false)
    setSelectedIds(new Set())

    if (successCount > 0) {
      toast.success(`Enriched ${successCount} prospects`)
    }
    if (failCount > 0) {
      toast.error(`Failed to enrich ${failCount} prospects`)
    }
  }

  // Bulk status update
  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedIds.size === 0) return

    try {
      const response = await fetch('/api/growth/prospects/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          data: { status: newStatus },
        }),
      })

      if (response.ok) {
        setProspects(prev => prev.map(p =>
          selectedIds.has(p.id) ? { ...p, status: newStatus } : p
        ))
        setSelectedIds(new Set())
        toast.success(`Updated ${selectedIds.size} prospects`)
      } else {
        toast.error('Failed to update prospects')
      }
    } catch (error) {
      toast.error('Failed to update prospects')
    }
  }

  // Move to Pipeline (prospect -> new)
  const handleMoveToPipeline = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select prospects to move to pipeline')
      return
    }

    try {
      const response = await fetch('/api/growth/prospects/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          data: { status: 'new' },
        }),
      })

      if (response.ok) {
        setProspects(prev => prev.map(p =>
          selectedIds.has(p.id) ? { ...p, status: 'new' } : p
        ))
        setSelectedIds(new Set())
        toast.success(`Moved ${selectedIds.size} prospects to pipeline`)
      } else {
        toast.error('Failed to move prospects to pipeline')
      }
    } catch (error) {
      toast.error('Failed to move prospects to pipeline')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />
  }

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'prospect', label: 'Prospect' },
    { value: 'new', label: 'New' },
    { value: 'researching', label: 'Researching' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'engaged', label: 'Engaged' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'proposal_sent', label: 'Proposal Sent' },
    { value: 'won', label: 'Won' },
    { value: 'lost', label: 'Lost' },
    { value: 'nurturing', label: 'Nurturing' },
  ]

  const priorityOptions = [
    { value: 'all', label: 'All Interest' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'Hot' },
    { value: 'medium', label: 'Warm' },
    { value: 'low', label: 'Cold' },
  ]

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">urgent</Badge>
      case 'high':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">hot</Badge>
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">warm</Badge>
      default:
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">cold</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      prospect: 'bg-slate-100 text-slate-600',
      new: 'bg-gray-100 text-gray-700',
      researching: 'bg-purple-100 text-purple-700',
      contacted: 'bg-blue-100 text-blue-700',
      engaged: 'bg-cyan-100 text-cyan-700',
      qualified: 'bg-green-100 text-green-700',
      proposal_sent: 'bg-amber-100 text-amber-700',
      won: 'bg-emerald-100 text-emerald-700',
      lost: 'bg-red-100 text-red-700',
      nurturing: 'bg-pink-100 text-pink-700',
    }
    return (
      <Badge className={`${colors[status] || 'bg-gray-100 text-gray-700'} hover:${colors[status] || 'bg-gray-100'}`}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900">Leads</h1>
          <p className="text-sm text-charcoal-500">AI-Native Lead Intelligence & Outreach OS</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/growth/prospects/import">
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          </Link>
          <Link href="/growth/prospects/new">
            <Button size="sm" className="bg-bronze-500 hover:bg-bronze-600">
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Target className="h-8 w-8 text-purple-500" />
              <Badge variant="outline" className="bg-purple-100 text-purple-700 border-0">0</Badge>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-purple-700">{stats.contactToday}</p>
              <p className="text-sm text-purple-600">Contact Today</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Zap className="h-8 w-8 text-orange-500" />
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-0">0</Badge>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-orange-700">{stats.hotLeads}</p>
              <p className="text-sm text-orange-600">Hot Leads</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Calendar className="h-8 w-8 text-amber-500" />
              <Badge variant="outline" className="bg-amber-100 text-amber-700 border-0">0</Badge>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-amber-700">{stats.followUp}</p>
              <p className="text-sm text-amber-600">Needs Follow-Up</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-emerald-700">{stats.total}</p>
              <p className="text-sm text-emerald-600">Total Leads</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 border rounded-md bg-background text-sm"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-9 px-3 border rounded-md bg-background text-sm"
            >
              {priorityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="h-9 px-3 border rounded-md bg-background text-sm"
            >
              <option value="all">All Facilities</option>
              {uniqueFacilities.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            <select
              value={priceLevelFilter}
              onChange={(e) => setPriceLevelFilter(e.target.value)}
              className="h-9 px-3 border rounded-md bg-background text-sm"
            >
              <option value="all">All Price Levels</option>
              <option value="$">$ (Budget)</option>
              <option value="$$">$$ (Moderate)</option>
              <option value="$$$">$$$ (Upscale)</option>
              <option value="$$$$">$$$$ (Fine Dining)</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-9 px-3 border rounded-md bg-background text-sm"
            >
              <option value="all">All Sources</option>
              {uniqueSources.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle & Tabs */}
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Leads ({stats.total})</TabsTrigger>
            <TabsTrigger value="contact_today">Contact Today ({stats.contactToday})</TabsTrigger>
            <TabsTrigger value="hot_leads">Hot Leads ({stats.hotLeads})</TabsTrigger>
            <TabsTrigger value="follow_up">Follow-Up ({stats.followUp})</TabsTrigger>
          </TabsList>
        </Tabs>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="mr-2 h-4 w-4" />
              Customize Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {ALL_COLUMNS.filter(c => !c.alwaysVisible).map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={visibleColumns.includes(col.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setVisibleColumns([...visibleColumns, col.id])
                  } else {
                    setVisibleColumns(visibleColumns.filter(c => c !== col.id))
                  }
                }}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="bg-bronze-50 border-bronze-200">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-bronze-700">
              {selectedIds.size} lead{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleMoveToPipeline}
                className="bg-bronze-500 hover:bg-bronze-600 text-white"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Move to Pipeline
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkEnrich}
                disabled={isEnrichingBulk}
                className="bg-white"
              >
                {isEnrichingBulk ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enriching...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI Enrich
                  </>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="bg-white">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Update Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {statusOptions.filter(s => s.value !== 'all').map((status) => (
                    <DropdownMenuItem
                      key={status.value}
                      onClick={() => handleBulkStatusUpdate(status.value)}
                    >
                      {status.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
                className="bg-white"
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spreadsheet Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="w-10 p-3 text-left">
                    <Checkbox
                      checked={selectedIds.size === filteredProspects.length && filteredProspects.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  {visibleColumns.includes('companyName') && (
                    <th className="p-3 text-left">
                      <button
                        className="flex items-center text-sm font-medium hover:text-primary"
                        onClick={() => handleSort('companyName')}
                      >
                        Business Name
                        <SortIcon field="companyName" />
                      </button>
                    </th>
                  )}
                  {visibleColumns.includes('contact') && (
                    <th className="p-3 text-left text-sm font-medium">Contact</th>
                  )}
                  {visibleColumns.includes('status') && (
                    <th className="p-3 text-left">
                      <button
                        className="flex items-center text-sm font-medium hover:text-primary"
                        onClick={() => handleSort('status')}
                      >
                        Status
                        <SortIcon field="status" />
                      </button>
                    </th>
                  )}
                  {visibleColumns.includes('businessType') && (
                    <th className="p-3 text-left text-sm font-medium">Facility Type</th>
                  )}
                  {visibleColumns.includes('priceLevel') && (
                    <th className="p-3 text-left text-sm font-medium">Price Level</th>
                  )}
                  {visibleColumns.includes('priority') && (
                    <th className="p-3 text-left">
                      <button
                        className="flex items-center text-sm font-medium hover:text-primary"
                        onClick={() => handleSort('priority')}
                      >
                        Interest
                        <SortIcon field="priority" />
                      </button>
                    </th>
                  )}
                  {visibleColumns.includes('address') && (
                    <th className="p-3 text-left text-sm font-medium">City</th>
                  )}
                  {visibleColumns.includes('email') && (
                    <th className="p-3 text-left text-sm font-medium">Email</th>
                  )}
                  {visibleColumns.includes('phone') && (
                    <th className="p-3 text-left text-sm font-medium">Phone</th>
                  )}
                  {visibleColumns.includes('estimatedValue') && (
                    <th className="p-3 text-left">
                      <button
                        className="flex items-center text-sm font-medium hover:text-primary"
                        onClick={() => handleSort('estimatedValue')}
                      >
                        Value
                        <SortIcon field="estimatedValue" />
                      </button>
                    </th>
                  )}
                  {visibleColumns.includes('source') && (
                    <th className="p-3 text-left text-sm font-medium">Source</th>
                  )}
                  {visibleColumns.includes('aiEnriched') && (
                    <th className="p-3 text-left text-sm font-medium">Enriched</th>
                  )}
                  {visibleColumns.includes('actions') && (
                    <th className="w-20 p-3 text-left text-sm font-medium">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProspects.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="p-8 text-center text-muted-foreground">
                      No leads found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredProspects.map((prospect) => {
                    const primaryContact = prospect.contacts[0]
                    const address = prospect.address as any

                    return (
                      <tr
                        key={prospect.id}
                        className={`hover:bg-muted/30 cursor-pointer ${selectedIds.has(prospect.id) ? 'bg-bronze-50' : ''}`}
                        onClick={() => router.push(`/growth/prospects/${prospect.id}`)}
                      >
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(prospect.id)}
                            onCheckedChange={() => toggleSelect(prospect.id)}
                          />
                        </td>
                        {visibleColumns.includes('companyName') && (
                          <td className="p-3">
                            <div className="font-medium text-charcoal-900">{prospect.companyName}</div>
                          </td>
                        )}
                        {visibleColumns.includes('contact') && (
                          <td className="p-3 text-sm text-muted-foreground">
                            {primaryContact ? (
                              <span>{primaryContact.firstName} {primaryContact.lastName}</span>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </td>
                        )}
                        {visibleColumns.includes('status') && (
                          <td className="p-3">
                            {getStatusBadge(prospect.status)}
                          </td>
                        )}
                        {visibleColumns.includes('businessType') && (
                          <td className="p-3 text-sm">
                            {prospect.businessType || <span className="text-muted-foreground/50">-</span>}
                          </td>
                        )}
                        {visibleColumns.includes('priceLevel') && (
                          <td className="p-3 text-sm">
                            {prospect.priceLevel ? (
                              <span className="font-medium text-emerald-700">{prospect.priceLevel}</span>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </td>
                        )}
                        {visibleColumns.includes('priority') && (
                          <td className="p-3">
                            {getPriorityBadge(prospect.priority)}
                          </td>
                        )}
                        {visibleColumns.includes('address') && (
                          <td className="p-3 text-sm">
                            {address?.city || <span className="text-muted-foreground/50">-</span>}
                          </td>
                        )}
                        {visibleColumns.includes('email') && (
                          <td className="p-3 text-sm">
                            {primaryContact?.email ? (
                              <span className="truncate max-w-[180px] block" title={primaryContact.email}>
                                {primaryContact.email}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </td>
                        )}
                        {visibleColumns.includes('phone') && (
                          <td className="p-3 text-sm">
                            {prospect.phone || primaryContact?.phone || <span className="text-muted-foreground/50">-</span>}
                          </td>
                        )}
                        {visibleColumns.includes('estimatedValue') && (
                          <td className="p-3 text-sm">
                            {prospect.estimatedValue ? (
                              <span className="font-medium">${Number(prospect.estimatedValue).toLocaleString()}</span>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </td>
                        )}
                        {visibleColumns.includes('source') && (
                          <td className="p-3 text-sm capitalize">
                            {prospect.source.replace('_', ' ')}
                          </td>
                        )}
                        {visibleColumns.includes('aiEnriched') && (
                          <td className="p-3">
                            {prospect.aiEnriched ? (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Yes
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </td>
                        )}
                        {visibleColumns.includes('actions') && (
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/growth/prospects/${prospect.id}`)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                {primaryContact?.email && (
                                  <DropdownMenuItem onClick={() => router.push(`/growth/outreach?prospect=${prospect.id}&channel=email`)}>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Send Email
                                  </DropdownMenuItem>
                                )}
                                {(prospect.phone || primaryContact?.phone) && (
                                  <DropdownMenuItem>
                                    <Phone className="mr-2 h-4 w-4" />
                                    Call
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`/api/growth/prospects/${prospect.id}/enrich`, {
                                        method: 'POST',
                                      })
                                      if (response.ok) {
                                        const data = await response.json()
                                        setProspects(prev => prev.map(p =>
                                          p.id === prospect.id ? { ...p, ...data.prospect, aiEnriched: true } : p
                                        ))
                                        toast.success('Prospect enriched')
                                      }
                                    } catch (error) {
                                      toast.error('Failed to enrich')
                                    }
                                  }}
                                >
                                  <Sparkles className="mr-2 h-4 w-4" />
                                  AI Enrich
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <p className="text-sm text-muted-foreground text-center">
        Showing {filteredProspects.length} of {prospects.length} leads
      </p>
    </div>
  )
}
