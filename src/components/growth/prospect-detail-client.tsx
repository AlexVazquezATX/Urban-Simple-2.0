'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  ArrowLeft,
  Mail,
  Phone,
  Edit,
  Calendar,
  User,
  Sparkles,
  Loader2,
  MapPin,
  Building2,
  DollarSign,
  Globe,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  MessageSquare,
  Save,
  ExternalLink,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ProspectDetailClientProps {
  prospect: any
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

export function ProspectDetailClient({ prospect: initialProspect }: ProspectDetailClientProps) {
  const router = useRouter()
  const [prospect, setProspect] = useState(initialProspect)
  const [isEnriching, setIsEnriching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('details')

  // Form state
  const address = prospect.address as any || {}
  const discoveryData = prospect.discoveryData as any || {}
  const socialMedia = discoveryData.socialMedia || {}

  const [formData, setFormData] = useState({
    // Contact Info
    contactName: prospect.contacts[0] ? `${prospect.contacts[0].firstName} ${prospect.contacts[0].lastName}` : '',
    contactEmail: prospect.contacts[0]?.email || '',
    contactPhone: prospect.contacts[0]?.phone || prospect.phone || '',
    contactTitle: prospect.contacts[0]?.title || '',
    companyName: prospect.companyName,
    website: prospect.website || '',

    // Location & Business
    city: address.city || '',
    state: address.state || '',
    street: address.street || '',
    zip: address.zip || '',
    businessType: prospect.businessType || '',
    industry: prospect.industry || '',
    estimatedSize: prospect.estimatedSize || '',
    priceLevel: discoveryData.externalData?.googlePriceLevel || discoveryData.externalData?.yelpPrice || '',

    // Pipeline & Status
    status: prospect.status,
    priority: prospect.priority,
    source: prospect.source,
    estimatedValue: prospect.estimatedValue ? String(prospect.estimatedValue) : '',
    nextFollowUp: prospect.nextFollowUp || '',

    // Social Media
    linkedin: socialMedia.linkedin || '',
    instagram: socialMedia.instagram || '',
    facebook: socialMedia.facebook || '',
    twitter: socialMedia.twitter || '',

    // Notes
    notes: prospect.notes || '',
  })

  const handleEnrich = async () => {
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
      setProspect(data.prospect)
      toast.success('Lead enriched with AI insights')

      // Update form data with enriched values
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
    } catch (error: any) {
      console.error('Error enriching:', error)
      toast.error(error.message || 'Failed to enrich lead')
    } finally {
      setIsEnriching(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Parse contact name
      const nameParts = formData.contactName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

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
          // Contact update
          contact: {
            id: prospect.contacts[0]?.id,
            firstName,
            lastName,
            email: formData.contactEmail || null,
            phone: formData.contactPhone || null,
            title: formData.contactTitle || null,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }

      const data = await response.json()
      setProspect(data)
      toast.success('Lead saved successfully')
    } catch (error: any) {
      console.error('Error saving:', error)
      toast.error(error.message || 'Failed to save lead')
    } finally {
      setIsSaving(false)
    }
  }

  const handleMoveToPipeline = async () => {
    try {
      const response = await fetch(`/api/growth/prospects/${prospect.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'new',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to move to pipeline')
      }

      const data = await response.json()
      setProspect(data)
      setFormData(prev => ({ ...prev, status: 'new' }))
      toast.success('Moved to pipeline')
    } catch (error: any) {
      console.error('Error moving to pipeline:', error)
      toast.error(error.message || 'Failed to move to pipeline')
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return '1st'
      case 'high': return '2nd'
      case 'medium': return '3rd'
      default: return '4th'
    }
  }

  const getInterestBadge = (priority: string) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/growth/prospects">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Leads
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-charcoal-900">{prospect.companyName}</h1>
            <p className="text-sm text-muted-foreground">
              {prospect.legalName || prospect.companyName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {formData.status === 'prospect' && (
            <Button
              onClick={handleMoveToPipeline}
              className="bg-bronze-500 hover:bg-bronze-600 text-white"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Add to Pipeline
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleEnrich}
            disabled={isEnriching}
          >
            {isEnriching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Enrich
          </Button>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Cadence
          </Button>
          <Link href={`/growth/outreach?prospect=${prospect.id}&channel=email`}>
            <Button variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={isSaving} className="bg-charcoal-900 hover:bg-charcoal-800">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Edit Lead
          </Button>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex items-center gap-2">
        <Badge variant="outline">{formData.status}</Badge>
        {getInterestBadge(formData.priority)}
        <Badge variant="outline">Priority: {getPriorityLabel(formData.priority)}</Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-6">
          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon" className="bg-red-100 text-red-600 hover:bg-red-200 border-red-200">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="john@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="(512) 555-1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://company.com"
                      className="flex-1"
                    />
                    {formData.website && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(formData.website, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Title / Role</Label>
                  <Input
                    value={formData.contactTitle}
                    onChange={(e) => setFormData({ ...formData, contactTitle: e.target.value })}
                    placeholder="Owner, GM, etc."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location & Business Details */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                Location & Business Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Austin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="TX"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Facility Type</Label>
                  <Select
                    value={formData.businessType}
                    onValueChange={(value) => setFormData({ ...formData, businessType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {FACILITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Input
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="Hospitality"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Size</Label>
                  <Select
                    value={formData.estimatedSize}
                    onValueChange={(value) => setFormData({ ...formData, estimatedSize: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Price Level</Label>
                  <Select
                    value={formData.priceLevel}
                    onValueChange={(value) => setFormData({ ...formData, priceLevel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select price" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline & Status */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                Pipeline & Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Interest Level</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTEREST_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value) => setFormData({ ...formData, source: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Deal Value</Label>
                  <Input
                    type="number"
                    value={formData.estimatedValue}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                    placeholder="10000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Next Follow-Up</Label>
                  <Input
                    type="date"
                    value={formData.nextFollowUp}
                    onChange={(e) => setFormData({ ...formData, nextFollowUp: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-muted-foreground" />
                Social Media
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-blue-600" />
                    LinkedIn
                  </Label>
                  <Input
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    placeholder="LinkedIn URL"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-600" />
                    Instagram
                  </Label>
                  <Input
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="Instagram URL"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-blue-700" />
                    Facebook
                  </Label>
                  <Input
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    placeholder="Facebook URL"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-sky-500" />
                    Twitter
                  </Label>
                  <Input
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    placeholder="Twitter URL"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Your Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add your notes about this lead..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Enrichment Data */}
          {prospect.aiEnriched && discoveryData.aiEnrichment && (
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg text-purple-700">
                  <Sparkles className="h-5 w-5" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {discoveryData.aiEnrichment.insights && (
                  <div>
                    <Label className="text-purple-600">Analysis</Label>
                    <p className="text-sm mt-1">{discoveryData.aiEnrichment.insights}</p>
                  </div>
                )}
                {discoveryData.aiEnrichment.outreachSuggestion && (
                  <div>
                    <Label className="text-purple-600">Outreach Suggestion</Label>
                    <p className="text-sm mt-1">{discoveryData.aiEnrichment.outreachSuggestion}</p>
                  </div>
                )}
                {discoveryData.aiEnrichment.estimatedRevenue && (
                  <div>
                    <Label className="text-purple-600">Estimated Revenue</Label>
                    <p className="text-sm mt-1">{discoveryData.aiEnrichment.estimatedRevenue}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {discoveryData.externalData?.googleRating && (
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Google Rating</p>
                      <p className="font-semibold">{discoveryData.externalData.googleRating}/5 ({discoveryData.externalData.googleReviewCount} reviews)</p>
                    </div>
                  )}
                  {discoveryData.externalData?.yelpRating && (
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Yelp Rating</p>
                      <p className="font-semibold">{discoveryData.externalData.yelpRating}/5 ({discoveryData.externalData.yelpReviewCount} reviews)</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {prospect.activities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p className="font-medium">No activities yet</p>
                  <p className="text-sm">Activities will appear here when you interact with this lead</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prospect.activities.map((activity: any) => (
                    <div key={activity.id} className="border-l-2 border-bronze-300 pl-4 pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold capitalize">
                              {activity.type.replace('_', ' ')}
                            </span>
                            {activity.channel && (
                              <Badge variant="outline" className="text-xs">
                                {activity.channel}
                              </Badge>
                            )}
                          </div>
                          {activity.title && (
                            <p className="mt-1 font-medium">{activity.title}</p>
                          )}
                          {activity.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {activity.description}
                            </p>
                          )}
                          {activity.outcome && (
                            <Badge variant="outline" className="mt-2">
                              {activity.outcome}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {activity.user.firstName} {activity.user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
