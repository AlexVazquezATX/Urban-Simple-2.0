'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Loader2,
  Mail,
  Phone,
  Building2,
  User,
  MapPin,
  Globe,
  DollarSign,
  Sparkles,
  Save,
  ExternalLink,
  ArrowRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  Calendar,
  MessageSquare,
  Plus,
  Trash2,
  ChevronDown,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'

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
  notes?: string | null
  aiEnriched?: boolean
  discoveryData?: any
  nextFollowUp?: string | null
  estimatedSize?: string | null
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
  activities?: Array<{
    id: string
    type: string
    title?: string | null
    description?: string | null
    channel?: string | null
    outcome?: string | null
    createdAt: string
    user: {
      firstName: string
      lastName: string
    }
  }>
  assignedTo?: {
    id: string
    firstName: string
    lastName: string
  } | null
  _count?: {
    activities: number
  }
}

interface ProspectDetailPanelProps {
  prospect: Prospect | null
  onClose: () => void
  onSave: (savedProspect?: Prospect) => void
  onEnrich?: (prospectId: string) => Promise<void>
}

const STATUS_OPTIONS = [
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

const INTEREST_LEVELS = [
  { value: 'low', label: 'Cold' },
  { value: 'medium', label: 'Warm' },
  { value: 'high', label: 'Hot' },
  { value: 'urgent', label: 'Urgent' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: '4th Priority' },
  { value: 'medium', label: '3rd Priority' },
  { value: 'high', label: '2nd Priority' },
  { value: 'urgent', label: '1st Priority' },
]

const SOURCE_OPTIONS = [
  { value: 'manual', label: 'Manual Entry' },
  { value: 'csv_import', label: 'CSV Import' },
  { value: 'ai_discovery', label: 'AI Discovery' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'meta', label: 'Meta Ads' },
  { value: 'other', label: 'Other' },
]

const FACILITY_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'resort', label: 'Resort' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'nightclub', label: 'Nightclub' },
  { value: 'brewery', label: 'Brewery' },
  { value: 'winery', label: 'Winery' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'catering', label: 'Catering' },
  { value: 'country_club', label: 'Country Club' },
  { value: 'event_venue', label: 'Event Venue' },
]

const SIZE_OPTIONS = [
  { value: 'small', label: 'Small (1-10)' },
  { value: 'medium', label: 'Medium (11-50)' },
  { value: 'large', label: 'Large (50+)' },
]

const PRICE_LEVELS = [
  { value: '$', label: '$' },
  { value: '$$', label: '$$' },
  { value: '$$$', label: '$$$' },
  { value: '$$$$', label: '$$$$' },
]

export function ProspectDetailPanel({
  prospect,
  onClose,
  onSave,
  onEnrich,
}: ProspectDetailPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

  // Multi-contact state
  const [selectedContactIndex, setSelectedContactIndex] = useState(0)
  const [contacts, setContacts] = useState(prospect?.contacts || [])

  // Email finder state
  const [isFindingEmail, setIsFindingEmail] = useState(false)
  const [emailSuggestions, setEmailSuggestions] = useState<any[]>([])
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false)
  const [isVerifyingEmail, setIsVerifyingEmail] = useState<string | null>(null)

  // Form state
  const address = prospect?.address as any || {}
  const discoveryData = prospect?.discoveryData as any || {}
  const socialMedia = discoveryData.socialMedia || {}

  // Get current contact based on selection
  const currentContact = contacts[selectedContactIndex] || null

  const [formData, setFormData] = useState({
    contactName: currentContact ? `${currentContact.firstName} ${currentContact.lastName}` : '',
    contactEmail: currentContact?.email || '',
    contactPhone: currentContact?.phone || prospect?.phone || '',
    contactTitle: currentContact?.title || '',
    companyName: prospect?.companyName || '',
    website: prospect?.website || '',
    city: address.city || '',
    state: address.state || '',
    street: address.street || '',
    zip: address.zip || '',
    businessType: prospect?.businessType || '',
    industry: prospect?.industry || '',
    estimatedSize: prospect?.estimatedSize || '',
    priceLevel: discoveryData.externalData?.googlePriceLevel || discoveryData.externalData?.yelpPrice || '',
    status: prospect?.status || 'prospect',
    priority: prospect?.priority || 'low',
    source: prospect?.source || 'manual',
    estimatedValue: prospect?.estimatedValue ? String(prospect.estimatedValue) : '',
    nextFollowUp: prospect?.nextFollowUp || '',
    linkedin: socialMedia.linkedin || '',
    instagram: socialMedia.instagram || '',
    facebook: socialMedia.facebook || '',
    twitter: socialMedia.twitter || '',
    notes: prospect?.notes || '',
  })

  // Trigger slide-in animation
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  // Reset form when prospect changes
  useEffect(() => {
    if (prospect) {
      const addr = prospect.address as any || {}
      const disc = prospect.discoveryData as any || {}
      const social = disc.socialMedia || {}

      // Reset contacts and selection
      setContacts(prospect.contacts || [])
      setSelectedContactIndex(0)

      const firstContact = prospect.contacts?.[0]

      setFormData({
        contactName: firstContact ? `${firstContact.firstName} ${firstContact.lastName}` : '',
        contactEmail: firstContact?.email || '',
        contactPhone: firstContact?.phone || prospect.phone || '',
        contactTitle: firstContact?.title || '',
        companyName: prospect.companyName,
        website: prospect.website || '',
        city: addr.city || '',
        state: addr.state || '',
        street: addr.street || '',
        zip: addr.zip || '',
        businessType: prospect.businessType || '',
        industry: prospect.industry || '',
        estimatedSize: prospect.estimatedSize || '',
        priceLevel: disc.externalData?.googlePriceLevel || disc.externalData?.yelpPrice || '',
        status: prospect.status,
        priority: prospect.priority,
        source: prospect.source,
        estimatedValue: prospect.estimatedValue ? String(prospect.estimatedValue) : '',
        nextFollowUp: prospect.nextFollowUp || '',
        linkedin: social.linkedin || '',
        instagram: social.instagram || '',
        facebook: social.facebook || '',
        twitter: social.twitter || '',
        notes: prospect.notes || '',
      })
    }
  }, [prospect])

  // Update contact fields when switching between contacts
  const updateFormForContact = useCallback((contact: typeof contacts[0] | null) => {
    setFormData(prev => ({
      ...prev,
      contactName: contact ? `${contact.firstName} ${contact.lastName}` : '',
      contactEmail: contact?.email || '',
      contactPhone: contact?.phone || prospect?.phone || '',
      contactTitle: contact?.title || '',
    }))
  }, [prospect])

  // Switch contact handler
  const handleSwitchContact = (index: number) => {
    // Save current contact data before switching
    if (contacts[selectedContactIndex]) {
      const nameParts = formData.contactName.trim().split(' ')
      const updatedContacts = [...contacts]
      updatedContacts[selectedContactIndex] = {
        ...updatedContacts[selectedContactIndex],
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: formData.contactEmail || null,
        phone: formData.contactPhone || null,
        title: formData.contactTitle || null,
      }
      setContacts(updatedContacts)
    }

    setSelectedContactIndex(index)
    updateFormForContact(contacts[index])
  }

  // Add new contact
  const handleAddContact = () => {
    const newContact = {
      id: `new-${Date.now()}`,
      firstName: '',
      lastName: '',
      email: null,
      phone: null,
      title: null,
    }
    const newContacts = [...contacts, newContact]
    setContacts(newContacts)
    setSelectedContactIndex(newContacts.length - 1)
    updateFormForContact(newContact)
  }

  // Delete contact
  const handleDeleteContact = (index: number) => {
    if (contacts.length <= 1) {
      toast.error('Must have at least one contact')
      return
    }

    const newContacts = contacts.filter((_, i) => i !== index)
    setContacts(newContacts)

    // Adjust selection if needed
    const newIndex = index >= newContacts.length ? newContacts.length - 1 : index
    setSelectedContactIndex(newIndex)
    updateFormForContact(newContacts[newIndex])
  }

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(onClose, 200)
  }, [onClose])

  const handleSave = async () => {
    if (!prospect) return

    setLoading(true)
    try {
      // Update current contact in contacts array before saving
      const nameParts = formData.contactName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const updatedContacts = [...contacts]
      if (updatedContacts[selectedContactIndex]) {
        updatedContacts[selectedContactIndex] = {
          ...updatedContacts[selectedContactIndex],
          firstName,
          lastName,
          email: formData.contactEmail || null,
          phone: formData.contactPhone || null,
          title: formData.contactTitle || null,
        }
      }

      // Prepare contacts for API (separate new vs existing)
      const contactsToSave = updatedContacts.map(c => ({
        id: c.id.startsWith('new-') ? undefined : c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email || null,
        phone: c.phone || null,
        title: c.title || null,
      }))

      const response = await fetch(`/api/growth/prospects/${prospect.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          website: formData.website || null,
          phone: formData.contactPhone || null,
          address: {
            street: formData.street || null,
            city: formData.city || null,
            state: formData.state || null,
            zip: formData.zip || null,
          },
          businessType: formData.businessType || null,
          industry: formData.industry || null,
          estimatedSize: formData.estimatedSize || null,
          status: formData.status,
          priority: formData.priority,
          source: formData.source,
          estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : null,
          notes: formData.notes || null,
          discoveryData: {
            ...discoveryData,
            socialMedia: {
              linkedin: formData.linkedin || null,
              instagram: formData.instagram || null,
              facebook: formData.facebook || null,
              twitter: formData.twitter || null,
            },
          },
          contacts: contactsToSave,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }

      const savedProspect = await response.json()
      toast.success('Lead saved successfully')
      onSave(savedProspect)
      router.refresh()
    } catch (error: any) {
      console.error('Error saving:', error)
      toast.error(error.message || 'Failed to save lead')
    } finally {
      setLoading(false)
    }
  }

  const handleEnrich = async () => {
    if (!prospect) return

    setIsEnriching(true)
    try {
      const response = await fetch(`/api/growth/prospects/${prospect.id}/enrich`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to enrich')
      }

      const data = await response.json()
      toast.success('Lead enriched with AI insights')

      // Update form with enriched data
      const enrichedAddress = data.prospect.address as any || {}
      const enrichedDiscoveryData = data.prospect.discoveryData as any || {}

      setFormData(prev => ({
        ...prev,
        city: enrichedAddress.city || prev.city,
        state: enrichedAddress.state || prev.state,
        street: enrichedAddress.street || prev.street,
        businessType: data.prospect.businessType || prev.businessType,
        industry: data.prospect.industry || prev.industry,
        estimatedSize: data.prospect.estimatedSize || prev.estimatedSize,
        priceLevel: enrichedDiscoveryData.externalData?.googlePriceLevel || enrichedDiscoveryData.externalData?.yelpPrice || prev.priceLevel,
        contactPhone: data.prospect.phone || prev.contactPhone,
        website: data.prospect.website || prev.website,
      }))

      onSave(data.prospect)
    } catch (error: any) {
      console.error('Error enriching:', error)
      toast.error(error.message || 'Failed to enrich lead')
    } finally {
      setIsEnriching(false)
    }
  }

  const handleMoveToPipeline = async () => {
    if (!prospect) return

    try {
      const response = await fetch(`/api/growth/prospects/${prospect.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'new' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to move to pipeline')
      }

      const data = await response.json()
      setFormData(prev => ({ ...prev, status: 'new' }))
      toast.success('Moved to pipeline')
      onSave(data)
    } catch (error: any) {
      console.error('Error moving to pipeline:', error)
      toast.error(error.message || 'Failed to move to pipeline')
    }
  }

  const handleFindEmail = async () => {
    const website = formData.website
    if (!website) {
      toast.error('Please add a website first to find emails')
      return
    }

    const nameParts = formData.contactName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    if (!firstName) {
      toast.error('Please add a contact name first')
      return
    }

    let domain = website
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`)
      domain = url.hostname.replace(/^www\./, '')
    } catch {
      domain = website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
    }

    setIsFindingEmail(true)
    setEmailSuggestions([])

    try {
      const response = await fetch('/api/growth/email-prospecting/search/person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          domain,
          title: formData.contactTitle || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to find email')
      }

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        setEmailSuggestions(data.results)
        setShowEmailSuggestions(true)
        toast.success(`Found ${data.results.length} email suggestion${data.results.length > 1 ? 's' : ''}`)
      } else {
        toast.info('No email found for this contact')
      }
    } catch (error: any) {
      console.error('Error finding email:', error)
      toast.error(error.message || 'Failed to find email')
    } finally {
      setIsFindingEmail(false)
    }
  }

  const handleVerifyEmail = async (email: string) => {
    setIsVerifyingEmail(email)
    try {
      const response = await fetch('/api/growth/email-prospecting/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to verify email')
      }

      const data = await response.json()

      setEmailSuggestions(prev => prev.map(s =>
        s.email === email
          ? { ...s, verified: true, verificationResult: data }
          : s
      ))

      if (data.is_valid_format && data.deliverability === 'DELIVERABLE') {
        toast.success('Email verified successfully!')
      } else if (data.deliverability === 'RISKY') {
        toast.warning('Email is risky - proceed with caution')
      } else {
        toast.error('Email appears to be invalid')
      }
    } catch (error: any) {
      console.error('Error verifying email:', error)
      toast.error(error.message || 'Failed to verify email')
    } finally {
      setIsVerifyingEmail(null)
    }
  }

  const handleSelectEmail = (email: string) => {
    setFormData({ ...formData, contactEmail: email })
    setShowEmailSuggestions(false)
    toast.success('Email added to contact')
  }

  const getInterestBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200">urgent</Badge>
      case 'high':
        return <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 border-orange-200">hot</Badge>
      case 'medium':
        return <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-yellow-100 text-yellow-700 border-yellow-200">warm</Badge>
      default:
        return <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-200">cold</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      prospect: 'bg-warm-100 text-warm-600 border-warm-200',
      new: 'bg-warm-100 text-warm-700 border-warm-200',
      researching: 'bg-plum-100 text-plum-700 border-plum-200',
      contacted: 'bg-ocean-100 text-ocean-700 border-ocean-200',
      engaged: 'bg-ocean-100 text-ocean-700 border-ocean-200',
      qualified: 'bg-lime-100 text-lime-700 border-lime-200',
      proposal_sent: 'bg-warm-200 text-warm-700 border-warm-300',
      won: 'bg-lime-100 text-lime-700 border-lime-200',
      lost: 'bg-red-100 text-red-700 border-red-200',
      nurturing: 'bg-plum-100 text-plum-700 border-plum-200',
    }
    return (
      <Badge className={`rounded-sm text-[10px] px-1.5 py-0 ${colors[status] || 'bg-warm-100 text-warm-700 border-warm-200'}`}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  if (!prospect) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-warm-900/20 transition-opacity duration-200',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full max-w-xl bg-white shadow-xl border-l border-warm-200 flex flex-col transition-transform duration-200 ease-out',
          isVisible ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-200 bg-warm-50">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-lg font-medium text-warm-900 truncate">
              {formData.companyName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(formData.status)}
              {getInterestBadge(formData.priority)}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {formData.status === 'prospect' && (
              <Button
                size="sm"
                onClick={handleMoveToPipeline}
                className="bg-bronze-500 hover:bg-bronze-600 text-white rounded-sm"
              >
                <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                Pipeline
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleEnrich}
              disabled={isEnriching}
              className="rounded-sm"
            >
              {isEnriching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
            </Button>
            <button
              onClick={handleClose}
              className="p-2 rounded-sm hover:bg-warm-200 transition-colors"
            >
              <X className="w-5 h-5 text-warm-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-5 mt-3 rounded-sm bg-warm-100 p-1 justify-start">
            <TabsTrigger value="details" className="text-xs rounded-sm data-[state=active]:bg-white">Details</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs rounded-sm data-[state=active]:bg-white">Activity</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 overflow-y-auto scrollbar-elegant p-5 space-y-5 mt-0">
            {/* Contact Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-warm-700 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Contacts
                  {contacts.length > 1 && (
                    <Badge variant="outline" className="ml-1 text-[10px] rounded-sm">
                      {contacts.length}
                    </Badge>
                  )}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddContact}
                  className="h-7 text-xs text-bronze-600 hover:text-bronze-700 hover:bg-bronze-50"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </div>

              {/* Contact Selector - shows when multiple contacts */}
              {contacts.length > 1 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-warm-50 rounded-sm border border-warm-200">
                  {contacts.map((contact, index) => (
                    <div
                      key={contact.id}
                      className={cn(
                        'group flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs cursor-pointer transition-colors',
                        selectedContactIndex === index
                          ? 'bg-bronze-500 text-white'
                          : 'bg-white border border-warm-200 hover:border-bronze-300 text-warm-700'
                      )}
                      onClick={() => handleSwitchContact(index)}
                    >
                      <User className="h-3 w-3" />
                      <span className="truncate max-w-[100px]">
                        {contact.firstName || contact.title || `Contact ${index + 1}`}
                        {contact.lastName ? ` ${contact.lastName.charAt(0)}.` : ''}
                      </span>
                      {contact.email && (
                        <Mail className={cn(
                          'h-3 w-3',
                          selectedContactIndex === index ? 'text-white/70' : 'text-warm-400'
                        )} />
                      )}
                      {contacts.length > 1 && selectedContactIndex === index && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteContact(index)
                          }}
                          className="ml-0.5 p-0.5 rounded hover:bg-white/20"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Contact Name</Label>
                  <Input
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="John Smith"
                    className="rounded-sm h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Title / Role</Label>
                  <Input
                    value={formData.contactTitle}
                    onChange={(e) => setFormData({ ...formData, contactTitle: e.target.value })}
                    placeholder="Owner, GM, etc."
                    className="rounded-sm h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Company</Label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="rounded-sm h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="john@company.com"
                    className="rounded-sm h-9 text-sm flex-1"
                  />
                  <Popover open={showEmailSuggestions} onOpenChange={setShowEmailSuggestions}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleFindEmail}
                        disabled={isFindingEmail}
                        title="Find email using Apollo.io"
                        className="h-9 w-9 bg-bronze-50 hover:bg-bronze-100 border-bronze-200 rounded-sm"
                      >
                        {isFindingEmail ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4 text-bronze-600" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0 rounded-sm" align="end">
                      <div className="p-3 border-b">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">Email Suggestions</h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setShowEmailSuggestions(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {emailSuggestions.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No suggestions found
                          </div>
                        ) : (
                          emailSuggestions.map((suggestion, idx) => (
                            <div key={idx} className="p-2.5 border-b last:border-0 hover:bg-warm-50">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-xs truncate">{suggestion.email}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] text-muted-foreground capitalize">
                                      {suggestion.source || 'unknown'}
                                    </span>
                                    {suggestion.confidence && (
                                      <span className={`text-[10px] px-1 py-0 rounded ${
                                        suggestion.confidence >= 80 ? 'bg-green-100 text-green-700' :
                                        suggestion.confidence >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {suggestion.confidence}%
                                      </span>
                                    )}
                                    {suggestion.verified && (
                                      suggestion.verificationResult?.deliverability === 'DELIVERABLE' ? (
                                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <AlertCircle className="h-3 w-3 text-yellow-600" />
                                      )
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-2"
                                    onClick={() => handleVerifyEmail(suggestion.email)}
                                    disabled={isVerifyingEmail === suggestion.email || suggestion.verified}
                                  >
                                    {isVerifyingEmail === suggestion.email ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : suggestion.verified ? 'OK' : 'Verify'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-6 text-[10px] px-2 bg-bronze-500 hover:bg-bronze-600"
                                    onClick={() => handleSelectEmail(suggestion.email)}
                                  >
                                    Use
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="(512) 555-1234"
                    className="rounded-sm h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Website</Label>
                  <div className="flex gap-1">
                    <Input
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="company.com"
                      className="rounded-sm h-9 text-sm flex-1"
                    />
                    {formData.website && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-sm"
                        onClick={() => window.open(formData.website.startsWith('http') ? formData.website : `https://${formData.website}`, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Location & Business */}
            <div className="space-y-4 pt-4 border-t border-warm-200">
              <h3 className="text-sm font-medium text-warm-700 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location & Business
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Austin"
                    className="rounded-sm h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">State</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="TX"
                    className="rounded-sm h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Facility Type</Label>
                  <Select
                    value={formData.businessType}
                    onValueChange={(value) => setFormData({ ...formData, businessType: value })}
                  >
                    <SelectTrigger className="rounded-sm h-9 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {FACILITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Price Level</Label>
                  <Select
                    value={formData.priceLevel}
                    onValueChange={(value) => setFormData({ ...formData, priceLevel: value })}
                  >
                    <SelectTrigger className="rounded-sm h-9 text-sm">
                      <SelectValue placeholder="$" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Company Size</Label>
                  <Select
                    value={formData.estimatedSize}
                    onValueChange={(value) => setFormData({ ...formData, estimatedSize: value })}
                  >
                    <SelectTrigger className="rounded-sm h-9 text-sm">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Industry</Label>
                  <Input
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="Hospitality"
                    className="rounded-sm h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Pipeline & Status */}
            <div className="space-y-4 pt-4 border-t border-warm-200">
              <h3 className="text-sm font-medium text-warm-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pipeline & Status
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="rounded-sm h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Interest Level</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger className="rounded-sm h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTEREST_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Deal Value</Label>
                  <Input
                    type="number"
                    value={formData.estimatedValue}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                    placeholder="10000"
                    className="rounded-sm h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Source</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value) => setFormData({ ...formData, source: value })}
                  >
                    <SelectTrigger className="rounded-sm h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((source) => (
                        <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="space-y-4 pt-4 border-t border-warm-200">
              <h3 className="text-sm font-medium text-warm-700 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Social Media
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Linkedin className="h-3 w-3 text-blue-600" />
                    LinkedIn
                  </Label>
                  <Input
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    placeholder="LinkedIn URL"
                    className="rounded-sm h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Instagram className="h-3 w-3 text-pink-600" />
                    Instagram
                  </Label>
                  <Input
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="Instagram URL"
                    className="rounded-sm h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Facebook className="h-3 w-3 text-blue-700" />
                    Facebook
                  </Label>
                  <Input
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    placeholder="Facebook URL"
                    className="rounded-sm h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Twitter className="h-3 w-3 text-sky-500" />
                    Twitter
                  </Label>
                  <Input
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    placeholder="Twitter URL"
                    className="rounded-sm h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 pt-4 border-t border-warm-200">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add your notes about this lead..."
                rows={3}
                className="rounded-sm text-sm resize-none"
              />
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="flex-1 overflow-y-auto scrollbar-elegant p-5 mt-0">
            {!prospect.activities || prospect.activities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="mx-auto h-10 w-10 mb-3 opacity-50" />
                <p className="font-medium text-sm">No activities yet</p>
                <p className="text-xs mt-1">Activities will appear here when you interact with this lead</p>
              </div>
            ) : (
              <div className="space-y-3">
                {prospect.activities.map((activity) => (
                  <div key={activity.id} className="border-l-2 border-bronze-300 pl-3 pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm capitalize">
                            {activity.type.replace('_', ' ')}
                          </span>
                          {activity.channel && (
                            <Badge variant="outline" className="text-[10px] rounded-sm">
                              {activity.channel}
                            </Badge>
                          )}
                        </div>
                        {activity.title && (
                          <p className="mt-0.5 text-sm font-medium">{activity.title}</p>
                        )}
                        {activity.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{activity.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">
                          {activity.user.firstName} {activity.user.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(activity.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-warm-200 bg-white">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/growth/outreach?prospect=${prospect.id}&channel=email`)}
            className="rounded-sm"
          >
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            Email
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="rounded-sm border-warm-200"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={loading}
              variant="lime"
              className="rounded-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
