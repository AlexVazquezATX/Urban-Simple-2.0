'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { formatMoney } from '@/lib/format'
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
  SlidersHorizontal,
  Pencil,
  Zap,
  Calendar,
  Users,
  Target,
  Trash2,
  RefreshCw,
  ArrowRight,
  AtSign,
  UserPlus,
  X,
  ChevronLeft,
  ChevronRight,
  Ban,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ui/switch'
import { ProspectDetailPanel } from './prospect-detail-panel'
import { ProspectForm } from './prospect-form'

const PAGE_SIZE = 50

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
  sourceDetail?: string | null
  tags?: string[]
  phone?: string | null
  website?: string | null
  address?: any
  aiEnriched?: boolean
  priceLevel?: string | null
  doNotContact?: boolean
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
  _count?: {
    activities: number
    outreachMessages: number
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
  { id: 'website', label: 'Website', alwaysVisible: false },
  { id: 'email', label: 'Email', alwaysVisible: false },
  { id: 'phone', label: 'Phone', alwaysVisible: false },
  { id: 'estimatedValue', label: 'Value', alwaysVisible: false },
  { id: 'source', label: 'Source', alwaysVisible: false },
  { id: 'sourceDetail', label: 'Import List', alwaysVisible: false },
  { id: 'tags', label: 'Tags', alwaysVisible: false },
  { id: 'aiEnriched', label: 'Enriched', alwaysVisible: false },
  { id: 'lastContacted', label: 'Last Contacted', alwaysVisible: false },
  { id: 'createdAt', label: 'Date Added', alwaysVisible: false },
  { id: 'actions', label: 'Actions', alwaysVisible: true },
]

// Column discipline: keep ≤9 columns visible by default — everything else
// lives behind the Columns menu and the row detail panel.
const DEFAULT_VISIBLE_COLUMNS = [
  'companyName', 'contact', 'status', 'priority', 'address', 'email', 'estimatedValue', 'lastContacted', 'actions'
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
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [sourceDetailFilter, setSourceDetailFilter] = useState<string>('all')
  const [hasEmailOnly, setHasEmailOnly] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isEnrichingBulk, setIsEnrichingBulk] = useState(false)
  const [isFindingEmails, setIsFindingEmails] = useState(false)
  const [isFindingContacts, setIsFindingContacts] = useState(false)
  const [isDiscoveringOwners, setIsDiscoveringOwners] = useState(false)
  const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false)
  const [sequences, setSequences] = useState<any[]>([])
  const [isApplyingSequence, setIsApplyingSequence] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS)
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Prospect | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch available sequences for bulk apply
  useEffect(() => {
    fetch('/api/growth/outreach/sequences')
      .then(res => res.json())
      .then(data => setSequences(Array.isArray(data) ? data.filter((s: any) => s.status === 'active' || s.status === 'draft') : []))
      .catch(() => setSequences([]))
  }, [])

  // Calculate stats for tabs
  const stats = useMemo(() => {
    const now = new Date()

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
      withEmails: prospects.filter(p => p.contacts.some(c => c.email)).length,
      withWebsite: prospects.filter(p => p.website && p.website.trim().length > 0).length,
      noWebsite: prospects.filter(p => !p.website || p.website.trim().length === 0).length,
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

      // Tag filter
      const matchesTag = tagFilter === 'all' || (prospect.tags?.includes(tagFilter) ?? false)

      // Source Detail filter
      const matchesSourceDetail = sourceDetailFilter === 'all' || prospect.sourceDetail === sourceDetailFilter

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
      } else if (activeTab === 'with_emails') {
        matchesTab = prospect.contacts.some((c) => c.email)
      } else if (activeTab === 'with_website') {
        matchesTab = !!(prospect.website && prospect.website.trim().length > 0)
      } else if (activeTab === 'no_website') {
        matchesTab = !prospect.website || prospect.website.trim().length === 0
      }

      const matchesHasEmail = !hasEmailOnly || prospect.contacts?.some(c => c.email)

      return matchesSearch && matchesStatus && matchesSource && matchesPriority && matchesFacility && matchesPriceLevel && matchesTag && matchesSourceDetail && matchesTab && matchesHasEmail
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
  }, [prospects, searchQuery, statusFilter, sourceFilter, priorityFilter, facilityFilter, priceLevelFilter, tagFilter, sourceDetailFilter, hasEmailOnly, activeTab, sortField, sortDirection])

  // Get unique values for filters
  const uniqueSources = useMemo(() => {
    const sources = new Set(prospects.map(p => p.source))
    return Array.from(sources).sort()
  }, [prospects])

  const uniqueFacilities = useMemo(() => {
    const facilities = new Set(prospects.map(p => p.businessType).filter(Boolean))
    return Array.from(facilities).sort() as string[]
  }, [prospects])

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>()
    prospects.forEach(p => p.tags?.forEach(t => tags.add(t)))
    return Array.from(tags).sort()
  }, [prospects])

  const uniqueSourceDetails = useMemo(() => {
    const details = new Set(prospects.map(p => p.sourceDetail).filter(Boolean))
    return Array.from(details).sort() as string[]
  }, [prospects])

  // Pagination
  const totalPages = Math.ceil(filteredProspects.length / PAGE_SIZE)
  const paginatedProspects = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredProspects.slice(start, start + PAGE_SIZE)
  }, [filteredProspects, currentPage])

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1) }, [searchQuery, statusFilter, sourceFilter, priorityFilter, facilityFilter, priceLevelFilter, tagFilter, sourceDetailFilter, hasEmailOnly, activeTab])

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

  // Bulk find emails handler
  const handleBulkFindEmails = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select prospects to find emails')
      return
    }

    // Debug: log the selected prospects to understand the data structure
    const selectedProspects = prospects.filter(p => selectedIds.has(p.id))
    console.log('Selected prospects:', selectedProspects.map(p => ({
      id: p.id,
      companyName: p.companyName,
      website: p.website,
      hasContacts: p.contacts?.length > 0,
      firstContactEmail: p.contacts?.[0]?.email,
    })))

    // Get selected prospects that have a website but no email
    const prospectsToProcess = prospects.filter(p =>
      selectedIds.has(p.id) &&
      p.website &&
      p.contacts?.[0] &&
      !p.contacts[0].email
    )

    if (prospectsToProcess.length === 0) {
      // Provide more specific feedback
      const withEmail = selectedProspects.filter(p => p.contacts?.[0]?.email).length
      const noWebsite = selectedProspects.filter(p => !p.website).length
      const noContact = selectedProspects.filter(p => !p.contacts?.[0]).length

      let message = 'Cannot find emails: '
      const reasons = []
      if (withEmail > 0) reasons.push(`${withEmail} already have emails`)
      if (noWebsite > 0) reasons.push(`${noWebsite} missing website`)
      if (noContact > 0) reasons.push(`${noContact} missing contact name`)

      toast.info(message + (reasons.length > 0 ? reasons.join(', ') : 'unknown issue'))
      return
    }

    setIsFindingEmails(true)
    let successCount = 0
    let failCount = 0

    for (const prospect of prospectsToProcess) {
      try {
        const contact = prospect.contacts[0]
        const website = prospect.website!

        // Extract domain from website
        let domain = website
        try {
          const url = new URL(website.startsWith('http') ? website : `https://${website}`)
          domain = url.hostname.replace(/^www\./, '')
        } catch {
          domain = website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
        }

        const response = await fetch('/api/growth/email-prospecting/search/person', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: contact.firstName,
            lastName: contact.lastName,
            domain,
            title: contact.title || undefined,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.results && data.results.length > 0) {
            // Get the best email (highest confidence)
            const bestEmail = data.results.sort((a: any, b: any) =>
              (b.confidence || 0) - (a.confidence || 0)
            )[0]

            // Update the prospect with the found email
            const updateResponse = await fetch(`/api/growth/prospects/${prospect.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contact: {
                  id: contact.id,
                  firstName: contact.firstName,
                  lastName: contact.lastName,
                  email: bestEmail.email,
                  phone: contact.phone,
                  title: contact.title,
                },
              }),
            })

            if (updateResponse.ok) {
              // Update local state
              setProspects(prev => prev.map(p =>
                p.id === prospect.id
                  ? {
                      ...p,
                      contacts: [{
                        ...contact,
                        email: bestEmail.email,
                      }]
                    }
                  : p
              ))
              successCount++
            } else {
              failCount++
            }
          } else {
            failCount++
          }
        } else {
          failCount++
        }
      } catch (error) {
        console.error('Error finding email for prospect:', prospect.id, error)
        failCount++
      }
    }

    setIsFindingEmails(false)
    setSelectedIds(new Set())

    if (successCount > 0) {
      toast.success(`Found emails for ${successCount} prospect${successCount > 1 ? 's' : ''}`)
    }
    if (failCount > 0) {
      toast.info(`Could not find emails for ${failCount} prospect${failCount > 1 ? 's' : ''}`)
    }
  }

  // Bulk find contacts handler - discovers people at companies using domain search
  const handleBulkFindContacts = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select prospects to find contacts')
      return
    }

    // Get selected prospects that have a website but NO contacts
    const selectedProspects = prospects.filter(p => selectedIds.has(p.id))
    const prospectsToProcess = selectedProspects.filter(p =>
      p.website && (!p.contacts || p.contacts.length === 0)
    )

    if (prospectsToProcess.length === 0) {
      const withContacts = selectedProspects.filter(p => p.contacts?.length > 0).length
      const noWebsite = selectedProspects.filter(p => !p.website).length

      let message = 'Cannot find contacts: '
      const reasons = []
      if (withContacts > 0) reasons.push(`${withContacts} already have contacts`)
      if (noWebsite > 0) reasons.push(`${noWebsite} missing website`)

      toast.info(message + (reasons.length > 0 ? reasons.join(', ') : 'unknown issue'))
      return
    }

    setIsFindingContacts(true)
    let successCount = 0
    let totalContactsFound = 0
    let failCount = 0

    for (const prospect of prospectsToProcess) {
      try {
        const website = prospect.website!

        // Extract domain from website
        let domain = website
        try {
          const url = new URL(website.startsWith('http') ? website : `https://${website}`)
          domain = url.hostname.replace(/^www\./, '')
        } catch {
          domain = website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
        }

        console.log(`[Find Contacts] Searching domain: ${domain} for ${prospect.companyName}`)

        // Call domain search API to find contacts at this company
        // Use 'all' method to try Apollo + website scraping for better coverage
        const response = await fetch('/api/growth/email-prospecting/search/domain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain,
            method: 'all', // Try all methods: Apollo + scraper
            limit: 5,
            verifyEmails: false,
          }),
        })

        console.log(`[Find Contacts] Response status: ${response.status}`)

        if (response.ok) {
          const data = await response.json()
          console.log(`[Find Contacts] API response:`, data)
          // API returns { data: prospects[], meta: {} }
          const foundPeople = data.data || []
          console.log(`[Find Contacts] Found ${foundPeople.length} people at ${domain}`)
          if (foundPeople.length > 0) {
            // Create contacts from the found people
            const newContacts: Array<{
              id: string
              firstName: string
              lastName: string
              email?: string | null
              phone?: string | null
              title?: string | null
            }> = []

            for (const person of foundPeople) {
              // Create contact for this person
              // Handle cases where we only have email (from website scraper) vs full profile (from Apollo)
              const hasName = person.first_name || person.last_name
              const contactData = hasName
                ? {
                    firstName: person.first_name || '',
                    lastName: person.last_name || '',
                    email: person.email || null,
                    title: person.position || null,
                  }
                : {
                    // Email-only contact (from scraper) - use email prefix as placeholder
                    firstName: 'Contact',
                    lastName: person.email?.split('@')[0] || 'Unknown',
                    email: person.email || null,
                    title: person.notes || 'Found via website',
                  }

              const updateResponse = await fetch(`/api/growth/prospects/${prospect.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contact: contactData }),
              })

              if (updateResponse.ok) {
                const updated = await updateResponse.json()
                // Get the newly created contact
                if (updated.contacts && updated.contacts.length > 0) {
                  const latestContact = updated.contacts[updated.contacts.length - 1]
                  newContacts.push(latestContact)
                  totalContactsFound++
                }
              }
            }

            // Update local state with all new contacts
            if (newContacts.length > 0) {
              setProspects(prev => prev.map(p =>
                p.id === prospect.id
                  ? { ...p, contacts: newContacts }
                  : p
              ))
              successCount++
            }
          } else {
            console.log(`[Find Contacts] No people found for ${domain}`)
            failCount++
          }
        } else {
          const errorText = await response.text()
          console.error(`[Find Contacts] API error for ${domain}:`, response.status, errorText)
          failCount++
        }
      } catch (error) {
        console.error('[Find Contacts] Error finding contacts for prospect:', prospect.id, error)
        failCount++
      }
    }

    setIsFindingContacts(false)
    setSelectedIds(new Set())

    if (successCount > 0) {
      toast.success(`Found ${totalContactsFound} contact${totalContactsFound > 1 ? 's' : ''} for ${successCount} prospect${successCount > 1 ? 's' : ''}`)
    }
    if (failCount > 0) {
      toast.info(`Could not find contacts for ${failCount} prospect${failCount > 1 ? 's' : ''}`)
    }
  }


  // Bulk discover owners handler - BEST FOR HOSPITALITY (restaurants, hotels, venues)
  // Uses Yelp + Google + Apollo + Hunter.io to find REAL owner names and emails
  const handleBulkDiscoverOwners = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select prospects to discover owners')
      return
    }

    // Get selected prospects that have required info for discovery (businessName + city)
    const selectedProspects = prospects.filter(p => selectedIds.has(p.id))
    const prospectsToProcess = selectedProspects.filter(p => {
      const address = p.address as any
      return address?.city // Need at least a city for discovery
    })

    if (prospectsToProcess.length === 0) {
      const noCity = selectedProspects.filter(p => !(p.address as any)?.city).length

      toast.info(`Cannot discover owners: ${noCity} prospect${noCity > 1 ? 's are' : ' is'} missing city information`)
      return
    }

    setIsDiscoveringOwners(true)
    let successCount = 0
    let totalContactsFound = 0
    let failCount = 0
    let businessInfoUpdated = 0

    for (const prospect of prospectsToProcess) {
      try {
        const address = prospect.address as any

        // Extract domain from website if available
        let domain: string | undefined
        if (prospect.website) {
          try {
            const url = new URL(prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`)
            domain = url.hostname.replace(/^www\./, '')
          } catch {
            domain = prospect.website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
          }
        }

        console.log(`[Discover Owners] Searching for: ${prospect.companyName} in ${address.city}, ${address.state || 'unknown'}`)

        // Call the discover API - this uses Yelp + Google + Apollo + Hunter
        const response = await fetch('/api/growth/email-prospecting/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName: prospect.companyName,
            city: address.city,
            state: address.state || undefined,
            website: domain || undefined,
          }),
        })

        console.log(`[Discover Owners] Response status: ${response.status}`)

        if (response.ok) {
          const data = await response.json()
          console.log(`[Discover Owners] API response:`, data)
          console.log(`[Discover Owners] Sources used:`, data.meta?.sources)

          // data.data contains ONLY real people (from Yelp, Google, Hunter, Apollo)
          // data.discovery.hospitalityEmails are SUGGESTIONS (not real people)
          const realPeople = data.data || []
          const hospitalitySuggestions = data.discovery?.hospitalityEmails || []

          console.log(`[Discover Owners] Found ${realPeople.length} REAL contacts, ${hospitalitySuggestions.length} hospitality suggestions`)

          // Only create contacts from REAL people with valid names
          // Skip anyone with "Contact" as first name (those are fake placeholders)
          const validPeople = realPeople.filter((p: any) =>
            p.first_name &&
            p.first_name !== 'Contact' &&
            p.last_name &&
            p.last_name !== 'Unknown'
          )

          if (validPeople.length > 0) {
            // Create contacts from discovered REAL people
            const newContacts: Array<{
              id: string
              firstName: string
              lastName: string
              email?: string | null
              phone?: string | null
              title?: string | null
            }> = []

            // Prioritize contacts with emails, then owner names without emails
            const withEmails = validPeople.filter((p: any) => p.email)
            const withoutEmails = validPeople.filter((p: any) => !p.email)
            const toCreate = [...withEmails, ...withoutEmails.slice(0, 2)] // Max 2 without emails

            for (const person of toCreate) {
              const contactData = {
                firstName: person.first_name,
                lastName: person.last_name,
                email: person.email || null,
                title: person.position || null,
              }

              const updateResponse = await fetch(`/api/growth/prospects/${prospect.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contact: contactData }),
              })

              if (updateResponse.ok) {
                const updated = await updateResponse.json()
                if (updated.contacts && updated.contacts.length > 0) {
                  const latestContact = updated.contacts[updated.contacts.length - 1]
                  newContacts.push(latestContact)
                  totalContactsFound++
                }
              }
            }

            // Update local state with new contacts
            if (newContacts.length > 0) {
              setProspects(prev => prev.map(p =>
                p.id === prospect.id
                  ? { ...p, contacts: newContacts }
                  : p
              ))
              successCount++
            }
          }

          // Update business info if discovered (even if no contacts found)
          if (data.discovery?.businessInfo) {
            const bizInfo = data.discovery.businessInfo
            const updateData: any = {}

            if (bizInfo.phone && !prospect.phone) {
              updateData.phone = bizInfo.phone
            }
            if (bizInfo.website && !prospect.website) {
              updateData.website = bizInfo.website
            }
            if (bizInfo.priceLevel && !prospect.priceLevel) {
              updateData.priceLevel = bizInfo.priceLevel
            }
            // Store hospitality suggestions for later reference
            if (hospitalitySuggestions.length > 0) {
              updateData.discoveryData = {
                hospitalitySuggestions,
                discoveredAt: new Date().toISOString(),
                sources: data.meta?.sources,
              }
            }

            if (Object.keys(updateData).length > 0) {
              await fetch(`/api/growth/prospects/${prospect.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
              })
              businessInfoUpdated++

              // Update local state
              setProspects(prev => prev.map(p =>
                p.id === prospect.id
                  ? {
                      ...p,
                      phone: updateData.phone || p.phone,
                      website: updateData.website || p.website,
                      priceLevel: updateData.priceLevel || p.priceLevel,
                    }
                  : p
              ))
            }
          }

          // If no real contacts but we got hospitality suggestions, count as partial success
          if (validPeople.length === 0 && hospitalitySuggestions.length > 0) {
            console.log(`[Discover Owners] No real people found for ${prospect.companyName}, but got ${hospitalitySuggestions.length} hospitality suggestions`)
            // Don't count as fail - we still updated business info
          } else if (validPeople.length === 0) {
            failCount++
          }
        } else {
          const errorText = await response.text()
          console.error(`[Discover Owners] API error for ${prospect.companyName}:`, response.status, errorText)
          failCount++
        }
      } catch (error) {
        console.error('[Discover Owners] Error:', prospect.id, error)
        failCount++
      }
    }

    setIsDiscoveringOwners(false)
    setSelectedIds(new Set())

    // Provide detailed feedback
    if (successCount > 0) {
      toast.success(`Found ${totalContactsFound} real owner${totalContactsFound > 1 ? 's' : ''} for ${successCount} business${successCount > 1 ? 'es' : ''}`)
    }
    if (businessInfoUpdated > 0 && successCount === 0) {
      toast.info(`Updated business info for ${businessInfoUpdated} prospect${businessInfoUpdated > 1 ? 's' : ''}, but no owner names found. Try hospitality email patterns (info@, gm@, etc.)`)
    }
    if (failCount > 0 && successCount === 0 && businessInfoUpdated === 0) {
      toast.warning(`Could not find owner info for ${failCount} prospect${failCount > 1 ? 's' : ''}. Try manual research or hospitality patterns.`)
    }
  }

  // Generate outreach for selected prospects
  const handleBulkGenerateOutreach = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select prospects')
      return
    }

    // Filter to prospects that have email contacts
    const selectedProspects = prospects.filter((p) => selectedIds.has(p.id))
    const withEmails = selectedProspects.filter((p) =>
      p.contacts.some((c) => c.email)
    )

    if (withEmails.length === 0) {
      toast.error(
        `None of the ${selectedProspects.length} selected prospects have email contacts. Find emails first.`
      )
      return
    }

    setIsGeneratingOutreach(true)
    try {
      const res = await fetch('/api/growth/outreach/auto-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectIds: withEmails.map((p) => p.id),
          campaignId: 'auto',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to generate outreach')
        return
      }
      toast.success(
        `Generated ${data.generated} outreach email${data.generated !== 1 ? 's' : ''}. Opening approval queue...`
      )
      setSelectedIds(new Set())
      router.push('/growth/outreach')
    } catch {
      toast.error('Failed to generate outreach')
    } finally {
      setIsGeneratingOutreach(false)
    }
  }

  // Bulk apply sequence handler
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select prospects')
      return
    }

    const count = selectedIds.size
    const confirmWord = count > 5 ? 'DELETE' : null

    if (confirmWord) {
      const typed = window.prompt(
        `You are about to delete ${count} prospects. Type DELETE to confirm.`
      )
      if (typed !== confirmWord) {
        toast.info('Delete cancelled')
        return
      }
    } else {
      const ok = window.confirm(
        `Delete ${count} prospect${count === 1 ? '' : 's'}? They can be restored if needed.`
      )
      if (!ok) return
    }

    try {
      const res = await fetch('/api/growth/prospects/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete prospects')
        return
      }

      setProspects(prev => prev.filter(p => !selectedIds.has(p.id)))
      setSelectedIds(new Set())
      toast.success(`Deleted ${data.deleted} prospect${data.deleted === 1 ? '' : 's'}`)
    } catch {
      toast.error('Failed to delete prospects')
    }
  }

  const handleBulkApplySequence = async (sequenceId: string) => {
    if (selectedIds.size === 0) {
      toast.error('Please select prospects')
      return
    }

    setIsApplyingSequence(true)
    try {
      const res = await fetch(`/api/growth/outreach/sequences/${sequenceId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectIds: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to apply sequence')
        return
      }

      const parts = []
      if (data.applied > 0) parts.push(`Applied to ${data.applied} prospect${data.applied !== 1 ? 's' : ''}`)
      if (data.skipped > 0) parts.push(`${data.skipped} skipped`)
      toast.success(parts.join(', ') + '. Step 1 queued for review.')

      setSelectedIds(new Set())
    } catch {
      toast.error('Failed to apply sequence')
    } finally {
      setIsApplyingSequence(false)
    }
  }

  // Prospect detail panel handlers
  const handleSelectProspect = (prospect: Prospect) => {
    setSelectedProspect(prospect)
  }

  const handleClosePanel = () => {
    setSelectedProspect(null)
  }

  const handleSaveProspect = (savedProspect?: Prospect) => {
    if (savedProspect) {
      setProspects(prev => prev.map(p =>
        p.id === savedProspect.id ? { ...p, ...savedProspect } : p
      ))
    }
  }

  // Single-row delete (kebab menu → confirm dialog)
  const handleDeleteProspect = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/growth/prospects/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to delete lead')
      }
      setProspects(prev => prev.filter(p => p.id !== deleteTarget.id))
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(deleteTarget.id)
        return next
      })
      toast.success(`Deleted ${deleteTarget.companyName}`)
      setDeleteTarget(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete lead')
    } finally {
      setIsDeleting(false)
    }
  }

  // Presentational reset for the empty state's "Clear filters" action
  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setSourceFilter('all')
    setPriorityFilter('all')
    setFacilityFilter('all')
    setPriceLevelFilter('all')
    setTagFilter('all')
    setSourceDetailFilter('all')
    setHasEmailOnly(false)
  }

  // How many of the "More filters" popover controls are active
  const moreFilterCount = [
    priceLevelFilter !== 'all',
    sourceFilter !== 'all',
    sourceDetailFilter !== 'all',
    tagFilter !== 'all',
    hasEmailOnly,
  ].filter(Boolean).length

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

  // Chip mapping: urgent→coral · HOT→gold · everything quieter→neutral
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="coral" className="uppercase tracking-wider">urgent</Badge>
      case 'high':
        return <Badge variant="gold" className="uppercase tracking-wider">hot</Badge>
      case 'medium':
        return <Badge variant="neutral">warm</Badge>
      default:
        return <Badge variant="neutral">cold</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'neutral' | 'gold' | 'teal' | 'coral' | 'green'> = {
      prospect: 'neutral',
      new: 'neutral',
      researching: 'neutral',
      contacted: 'teal',
      engaged: 'teal',
      qualified: 'green',
      proposal_sent: 'gold',
      won: 'green',
      lost: 'coral',
      nurturing: 'neutral',
    }
    return (
      <Badge variant={variants[status] || 'neutral'}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  return (
    <div>
      <PageHeader
        kicker="GROWTH · PROSPECTS"
        title="Leads"
        subtitle="Lead intelligence and outreach, in one place"
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/growth/prospects/import">
                <Upload className="h-3.5 w-3.5" />
                Import
              </Link>
            </Button>
            <ProspectForm>
              <Button variant="gold" size="sm">
                <Plus className="h-3.5 w-3.5" />
                Add Lead
              </Button>
            </ProspectForm>
          </>
        }
      />

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Contact Today"
          value={stats.contactToday}
          sub="Need outreach"
          icon={Calendar}
          tone={stats.contactToday > 0 ? 'coral' : 'neutral'}
        />
        <StatCard
          label="Hot Leads"
          value={stats.hotLeads}
          sub="High interest"
          icon={Target}
          tone={stats.hotLeads > 0 ? 'gold' : 'neutral'}
        />
        <StatCard label="Follow-Up" value={stats.followUp} sub="Awaiting response" icon={Mail} />
        <StatCard label="Total Leads" value={stats.total} sub="In database" icon={Users} />
      </div>

      {/* Filter bar: search + 3 selects + More filters popover */}
      <Card className="mb-4 py-0">
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[180px] max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger size="sm" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger size="sm" className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={facilityFilter} onValueChange={setFacilityFilter}>
            <SelectTrigger size="sm" className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Facilities</SelectItem>
              {uniqueFacilities.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                More filters
                {moreFilterCount > 0 && (
                  <Badge variant="default" className="font-mono tabular-nums">{moreFilterCount}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-4">
              <div className="space-y-1.5">
                <Label>Price Level</Label>
                <Select value={priceLevelFilter} onValueChange={setPriceLevelFilter}>
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="$">$</SelectItem>
                    <SelectItem value="$$">$$</SelectItem>
                    <SelectItem value="$$$">$$$</SelectItem>
                    <SelectItem value="$$$$">$$$$</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {uniqueSources.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {uniqueSourceDetails.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Import List</Label>
                  <Select value={sourceDetailFilter} onValueChange={setSourceDetailFilter}>
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Import Lists</SelectItem>
                      {uniqueSourceDetails.map((sd) => (
                        <SelectItem key={sd} value={sd}>{sd}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {uniqueTags.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Tag</Label>
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      {uniqueTags.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between rounded-[9px] border border-border px-3 py-2">
                <span className="text-sm text-foreground">Has email only</span>
                <Switch checked={hasEmailOnly} onCheckedChange={setHasEmailOnly} />
              </div>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Count tabs + column controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              All <span className="font-mono text-xs tabular-nums text-muted-foreground">{stats.total}</span>
            </TabsTrigger>
            <TabsTrigger value="contact_today">
              Contact Today <span className="font-mono text-xs tabular-nums text-muted-foreground">{stats.contactToday}</span>
            </TabsTrigger>
            <TabsTrigger value="hot_leads">
              Hot <span className="font-mono text-xs tabular-nums text-muted-foreground">{stats.hotLeads}</span>
            </TabsTrigger>
            <TabsTrigger value="follow_up">
              Follow-Up <span className="font-mono text-xs tabular-nums text-muted-foreground">{stats.followUp}</span>
            </TabsTrigger>
            {stats.withEmails > 0 && (
              <TabsTrigger value="with_emails">
                Has Email <span className="font-mono text-xs tabular-nums text-muted-foreground">{stats.withEmails}</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="with_website">
              Has Website <span className="font-mono text-xs tabular-nums text-muted-foreground">{stats.withWebsite}</span>
            </TabsTrigger>
            <TabsTrigger value="no_website">
              No Website <span className="font-mono text-xs tabular-nums text-muted-foreground">{stats.noWebsite}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="h-3.5 w-3.5" />
              Columns
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
        <Card className="mb-4 border-gold-600/30 bg-gold-600/10 py-0 dark:border-gold-400/25 dark:bg-gold-400/12">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
            <span className="font-mono text-sm tabular-nums text-gold-600 dark:text-gold-400">
              {selectedIds.size} lead{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {/* Primary action — the one gold button in this region */}
              <Button size="sm" onClick={handleMoveToPipeline} variant="gold">
                <ArrowRight className="h-3.5 w-3.5" />
                Pipeline
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkEnrich}
                disabled={isEnrichingBulk}
              >
                {isEnrichingBulk ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Enrich
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDiscoverOwners}
                disabled={isDiscoveringOwners}
                title="Find owner names from Yelp & Google, then find their emails"
              >
                {isDiscoveringOwners ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Target className="h-3.5 w-3.5" />
                )}
                Discover Owners
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkGenerateOutreach}
                disabled={isGeneratingOutreach}
              >
                {isGeneratingOutreach ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mail className="h-3.5 w-3.5" />
                )}
                Outreach
              </Button>

              {/* More actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    More
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={handleBulkFindContacts}
                    disabled={isFindingContacts}
                  >
                    <UserPlus className="h-4 w-4" />
                    Find Contacts
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleBulkFindEmails}
                    disabled={isFindingEmails}
                  >
                    <AtSign className="h-4 w-4" />
                    Find Emails
                  </DropdownMenuItem>
                  {sequences.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {sequences.map((seq) => (
                        <DropdownMenuItem
                          key={seq.id}
                          onClick={() => handleBulkApplySequence(seq.id)}
                          disabled={isApplyingSequence}
                        >
                          <Zap className="h-4 w-4" />
                          {seq.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  <DropdownMenuSeparator />
                  {statusOptions.filter(s => s.value !== 'all').map((status) => (
                    <DropdownMenuItem
                      key={status.value}
                      onClick={() => handleBulkStatusUpdate(status.value)}
                    >
                      <RefreshCw className="h-4 w-4" />
                      {status.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4" />
                    Delete Prospects
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    checked={selectedIds.size === filteredProspects.length && filteredProspects.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                {visibleColumns.includes('companyName') && (
                  <TableHead>
                    <button
                      className="flex items-center transition-colors hover:text-foreground"
                      onClick={() => handleSort('companyName')}
                    >
                      Business Name
                      <SortIcon field="companyName" />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.includes('contact') && <TableHead>Contact</TableHead>}
                {visibleColumns.includes('status') && (
                  <TableHead>
                    <button
                      className="flex items-center transition-colors hover:text-foreground"
                      onClick={() => handleSort('status')}
                    >
                      Status
                      <SortIcon field="status" />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.includes('businessType') && <TableHead>Facility</TableHead>}
                {visibleColumns.includes('priceLevel') && <TableHead>Price</TableHead>}
                {visibleColumns.includes('priority') && (
                  <TableHead>
                    <button
                      className="flex items-center transition-colors hover:text-foreground"
                      onClick={() => handleSort('priority')}
                    >
                      Interest
                      <SortIcon field="priority" />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.includes('address') && <TableHead>City</TableHead>}
                {visibleColumns.includes('website') && <TableHead>Website</TableHead>}
                {visibleColumns.includes('email') && <TableHead>Email</TableHead>}
                {visibleColumns.includes('phone') && <TableHead>Phone</TableHead>}
                {visibleColumns.includes('estimatedValue') && (
                  <TableHead className="text-right">
                    <button
                      className="ml-auto flex items-center transition-colors hover:text-foreground"
                      onClick={() => handleSort('estimatedValue')}
                    >
                      Value
                      <SortIcon field="estimatedValue" />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.includes('source') && <TableHead>Source</TableHead>}
                {visibleColumns.includes('sourceDetail') && <TableHead>Import List</TableHead>}
                {visibleColumns.includes('tags') && <TableHead>Tags</TableHead>}
                {visibleColumns.includes('aiEnriched') && <TableHead>Enriched</TableHead>}
                {visibleColumns.includes('lastContacted') && (
                  <TableHead>
                    <button
                      className="flex items-center transition-colors hover:text-foreground"
                      onClick={() => handleSort('lastContactedAt')}
                    >
                      Last Contacted
                      <SortIcon field="lastContactedAt" />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.includes('createdAt') && (
                  <TableHead>
                    <button
                      className="flex items-center transition-colors hover:text-foreground"
                      onClick={() => handleSort('createdAt')}
                    >
                      Date Added
                      <SortIcon field="createdAt" />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.includes('actions') && (
                  <TableHead className="w-28 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedProspects.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={visibleColumns.length + 1} className="p-0">
                      <EmptyState
                        icon={Search}
                        title="No leads match these filters"
                        description="Try widening the search or clearing a filter or two."
                        action={
                          <Button variant="outline" size="sm" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProspects.map((prospect) => {
                    const primaryContact = prospect.contacts[0]
                    const address = prospect.address as any

                    const isWebsiteLead = prospect.tags?.includes('Website Lead')
                    const isNewWebsiteLead = isWebsiteLead && prospect.status === 'new'
                    // Never render "Not provided" — fall back to the contact
                    // name (plus the neutral Website Lead chip) or a muted dash.
                    const hasRealName =
                      !!prospect.companyName &&
                      prospect.companyName.trim().toLowerCase() !== 'not provided'
                    const contactFullName = primaryContact
                      ? `${primaryContact.firstName} ${primaryContact.lastName}`.trim()
                      : ''
                    const displayName = hasRealName ? prospect.companyName : contactFullName

                    return (
                      <TableRow
                        key={prospect.id}
                        data-state={selectedIds.has(prospect.id) ? 'selected' : undefined}
                        className={`cursor-pointer ${
                          isNewWebsiteLead && !selectedIds.has(prospect.id)
                            ? 'border-l-2 border-l-teal-600 bg-teal-600/5 dark:border-l-teal-300 dark:bg-teal-300/5'
                            : ''
                        }`}
                        onClick={() => handleSelectProspect(prospect)}
                      >
                        <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(prospect.id)}
                            onCheckedChange={() => toggleSelect(prospect.id)}
                          />
                        </TableCell>
                        {visibleColumns.includes('companyName') && (
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {displayName ? (
                                <span className="text-sm font-medium text-foreground">{displayName}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                              {prospect.doNotContact && (
                                <Badge variant="coral">
                                  <Ban className="h-2.5 w-2.5" />
                                  DNC
                                </Badge>
                              )}
                              {isWebsiteLead && <Badge variant="neutral">Website Lead</Badge>}
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.includes('contact') && (
                          <TableCell className="text-xs text-muted-foreground">
                            {primaryContact ? (
                              <div className="flex items-center gap-1.5">
                                <span>{primaryContact.firstName} {primaryContact.lastName}</span>
                                {prospect.contacts.length > 1 && (
                                  <Badge
                                    variant="neutral"
                                    className="font-mono tabular-nums"
                                    title={`${prospect.contacts.length} contacts`}
                                  >
                                    +{prospect.contacts.length - 1}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span>—</span>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.includes('status') && (
                          <TableCell>
                            {getStatusBadge(prospect.status)}
                          </TableCell>
                        )}
                        {visibleColumns.includes('businessType') && (
                          <TableCell className="text-xs text-muted-foreground">
                            {prospect.businessType || '—'}
                          </TableCell>
                        )}
                        {visibleColumns.includes('priceLevel') && (
                          <TableCell className="font-mono text-xs tabular-nums">
                            {prospect.priceLevel ? (
                              <span className="text-foreground">{prospect.priceLevel}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.includes('priority') && (
                          <TableCell>
                            {getPriorityBadge(prospect.priority)}
                          </TableCell>
                        )}
                        {visibleColumns.includes('address') && (
                          <TableCell className="text-xs text-muted-foreground">
                            {address?.city || '—'}
                          </TableCell>
                        )}
                        {visibleColumns.includes('website') && (
                          <TableCell className="text-xs">
                            {prospect.website ? (
                              <a
                                href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block max-w-[160px] truncate text-teal-600 hover:underline dark:text-teal-300"
                                title={prospect.website}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {prospect.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.includes('email') && (
                          <TableCell className="text-xs text-muted-foreground">
                            {primaryContact?.email ? (
                              <span className="block max-w-[160px] truncate" title={primaryContact.email}>
                                {primaryContact.email}
                              </span>
                            ) : (
                              <span>—</span>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.includes('phone') && (
                          <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                            {prospect.phone || primaryContact?.phone || '—'}
                          </TableCell>
                        )}
                        {visibleColumns.includes('estimatedValue') && (
                          <TableCell className="text-right font-mono text-xs tabular-nums">
                            {prospect.estimatedValue ? (
                              <span className="font-medium text-foreground">{formatMoney(Number(prospect.estimatedValue))}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.includes('source') && (
                          <TableCell className="text-xs capitalize text-muted-foreground">
                            {prospect.source.replace('_', ' ')}
                          </TableCell>
                        )}
                        {visibleColumns.includes('sourceDetail') && (
                          <TableCell className="text-xs text-muted-foreground">
                            {prospect.sourceDetail || '—'}
                          </TableCell>
                        )}
                        {visibleColumns.includes('tags') && (
                          <TableCell>
                            {prospect.tags && prospect.tags.length > 0 ? (
                              <div className="flex max-w-[200px] flex-wrap gap-1">
                                {prospect.tags.slice(0, 3).map(tag => (
                                  <Badge key={tag} variant="neutral">
                                    {tag}
                                  </Badge>
                                ))}
                                {prospect.tags.length > 3 && (
                                  <Badge variant="neutral" className="font-mono tabular-nums">
                                    +{prospect.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.includes('aiEnriched') && (
                          <TableCell>
                            {prospect.aiEnriched ? (
                              <Badge variant="gold">
                                <Sparkles className="h-2.5 w-2.5" />
                                AI
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.includes('lastContacted') && (
                          <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                            {prospect.lastContactedAt ? (
                              <div className="flex flex-col">
                                <span>
                                  {(() => {
                                    const days = Math.floor((Date.now() - new Date(prospect.lastContactedAt).getTime()) / 86400000)
                                    if (days === 0) return 'Today'
                                    if (days === 1) return 'Yesterday'
                                    return `${days}d ago`
                                  })()}
                                </span>
                                {(prospect._count?.outreachMessages ?? 0) > 0 && (
                                  <span className="text-[10px]">
                                    {prospect._count!.outreachMessages} sent
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span>Never</span>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.includes('createdAt') && (
                          <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                            {new Date(prospect.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </TableCell>
                        )}
                        {visibleColumns.includes('actions') && (
                          <TableCell className="pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleSelectProspect(prospect)}
                              >
                                View
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon-sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/growth/prospects/${prospect.id}`)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit
                                  </DropdownMenuItem>
                                  {primaryContact?.email && (
                                    <DropdownMenuItem onClick={() => router.push(`/growth/outreach?prospect=${prospect.id}&channel=email`)}>
                                      <Mail className="h-3.5 w-3.5" />
                                      Send Email
                                    </DropdownMenuItem>
                                  )}
                                  {(prospect.phone || primaryContact?.phone) && (
                                    <DropdownMenuItem>
                                      <Phone className="h-3.5 w-3.5" />
                                      Call
                                    </DropdownMenuItem>
                                  )}
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
                                    <Sparkles className="h-3.5 w-3.5" />
                                    AI Enrich
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setDeleteTarget(prospect)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          Showing {filteredProspects.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredProspects.length)} of {filteredProspects.length} leads
          {filteredProspects.length !== prospects.length && ` (${prospects.length} total)`}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Prospect Detail Panel */}
      {selectedProspect && (
        <ProspectDetailPanel
          prospect={selectedProspect}
          onClose={handleClosePanel}
          onSave={handleSaveProspect}
        />
      )}

      {/* Delete confirmation — the only place red is allowed */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes{' '}
              <span className="font-medium text-foreground">{deleteTarget?.companyName}</span>{' '}
              along with its contacts and activity history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteProspect()
              }}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
