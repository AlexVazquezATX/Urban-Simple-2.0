'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Sparkles, Loader2, Plus, ExternalLink, Star, Link2, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { ProspectForm } from './prospect-form'

// Expanded facility types
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
  { value: 'food', label: 'Food Service (Other)' },
]

// Price levels
const PRICE_LEVELS = [
  { value: '', label: 'Any Price' },
  { value: '$', label: '$ - Budget' },
  { value: '$$', label: '$$ - Moderate' },
  { value: '$$$', label: '$$$ - Upscale' },
  { value: '$$$$', label: '$$$$ - Fine Dining' },
]

interface DiscoveryResult {
  source: string
  name: string
  address: {
    street?: string
    city?: string
    state?: string
    zip?: string
  }
  phone?: string
  website?: string
  rating?: number
  reviewCount?: number
  types?: string[]
  categories?: string[]
  price?: string
  placeId?: string
  yelpId?: string
  rawData?: any
}

export function DiscoverySearch() {
  // API Search state
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [businessType, setBusinessType] = useState('restaurant')
  const [priceLevel, setPriceLevel] = useState('')
  const [minRating, setMinRating] = useState('')
  const [sources, setSources] = useState<string[]>(['google_places', 'yelp'])
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<DiscoveryResult[]>([])
  const [selectedResults, setSelectedResults] = useState<Set<number>>(new Set())

  // URL Scraper state
  const [scrapeUrl, setScrapeUrl] = useState('')
  const [isScraping, setIsScraping] = useState(false)
  const [scrapeResults, setScrapeResults] = useState<DiscoveryResult[]>([])
  const [selectedScrapeResults, setSelectedScrapeResults] = useState<Set<number>>(new Set())

  // Active tab
  const [activeTab, setActiveTab] = useState('api')

  const handleSearch = async () => {
    if (!city.trim()) {
      toast.error('Please enter a city')
      return
    }

    setIsSearching(true)
    setResults([])
    setSelectedResults(new Set())

    const location = state ? `${city}, ${state}` : city

    try {
      const response = await fetch('/api/growth/discovery/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `${businessType} ${location}`,
          location,
          city,
          state,
          type: businessType,
          priceLevel: priceLevel || undefined,
          minRating: minRating ? parseFloat(minRating) : undefined,
          sources,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to search')
      }

      const data = await response.json()
      setResults(data.results || [])
      
      if (data.results.length === 0) {
        toast.info('No results found. Try adjusting your search criteria.')
      } else {
        toast.success(`Found ${data.results.length} prospects`)
      }
    } catch (error: any) {
      console.error('Error searching:', error)
      toast.error(error.message || 'Failed to search for prospects')
    } finally {
      setIsSearching(false)
    }
  }

  const toggleResult = (index: number) => {
    const newSelected = new Set(selectedResults)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedResults(newSelected)
  }

  const handleAddSelected = async () => {
    if (selectedResults.size === 0) {
      toast.error('Please select at least one prospect')
      return
    }

    const selected = Array.from(selectedResults).map(i => results[i])
    const location = state ? `${city}, ${state}` : city

    try {
      const response = await fetch('/api/growth/prospects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospects: selected.map(result => ({
            companyName: result.name,
            address: result.address,
            phone: result.phone,
            website: result.website,
            source: 'ai_discovery',
            sourceDetail: `${result.source} - ${businessType} in ${location}`,
            discoveryData: result.rawData,
            businessType: businessType,
            priceLevel: result.price,
          })),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to import')
      }

      const data = await response.json()
      toast.success(`Imported ${data.created} prospects`)
      setSelectedResults(new Set())
      setResults([])
    } catch (error: any) {
      console.error('Error importing:', error)
      toast.error(error.message || 'Failed to import prospects')
    }
  }

  // URL Scraper functions
  const handleScrape = async () => {
    if (!scrapeUrl.trim()) {
      toast.error('Please enter a URL')
      return
    }

    // Validate URL
    try {
      new URL(scrapeUrl)
    } catch {
      toast.error('Please enter a valid URL')
      return
    }

    setIsScraping(true)
    setScrapeResults([])
    setSelectedScrapeResults(new Set())

    try {
      const response = await fetch('/api/growth/discovery/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to scrape URL')
      }

      const data = await response.json()
      setScrapeResults(data.results || [])

      if (data.results.length === 0) {
        toast.info('No businesses found on this page. Try a different URL.')
      } else {
        toast.success(`Found ${data.results.length} businesses`)
      }
    } catch (error: any) {
      console.error('Error scraping:', error)
      toast.error(error.message || 'Failed to scrape URL')
    } finally {
      setIsScraping(false)
    }
  }

  const toggleScrapeResult = (index: number) => {
    const newSelected = new Set(selectedScrapeResults)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedScrapeResults(newSelected)
  }

  const handleAddScrapeSelected = async () => {
    if (selectedScrapeResults.size === 0) {
      toast.error('Please select at least one business')
      return
    }

    const selected = Array.from(selectedScrapeResults).map(i => scrapeResults[i])

    try {
      const response = await fetch('/api/growth/prospects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospects: selected.map(result => ({
            companyName: result.name,
            address: result.address,
            phone: result.phone,
            website: result.website,
            source: 'ai_discovery',
            sourceDetail: `web_scraper - ${scrapeUrl}`,
            discoveryData: result.rawData,
          })),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to import')
      }

      const data = await response.json()
      toast.success(`Imported ${data.created} prospects`)
      setSelectedScrapeResults(new Set())
      setScrapeResults([])
    } catch (error: any) {
      console.error('Error importing:', error)
      toast.error(error.message || 'Failed to import prospects')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Discovery
          </CardTitle>
          <CardDescription>
            Find prospects using APIs or extract from web pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="api" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                API Search
              </TabsTrigger>
              <TabsTrigger value="scraper" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                URL Scraper
              </TabsTrigger>
            </TabsList>

            {/* API Search Tab */}
            <TabsContent value="api" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>City *</Label>
                  <Input
                    placeholder="e.g., Austin"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <Input
                    placeholder="e.g., TX"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div>
                  <Label>Facility Type</Label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background h-10"
                  >
                    {FACILITY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Price Level</Label>
                  <select
                    value={priceLevel}
                    onChange={(e) => setPriceLevel(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background h-10"
                  >
                    {PRICE_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Minimum Rating</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.5"
                    placeholder="e.g., 4.0"
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Data Sources</Label>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="google"
                        checked={sources.includes('google_places')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSources([...sources, 'google_places'])
                          } else {
                            setSources(sources.filter(s => s !== 'google_places'))
                          }
                        }}
                      />
                      <label htmlFor="google" className="text-sm">Google</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="yelp"
                        checked={sources.includes('yelp')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSources([...sources, 'yelp'])
                          } else {
                            setSources(sources.filter(s => s !== 'yelp'))
                          }
                        }}
                      />
                      <label htmlFor="yelp" className="text-sm">Yelp</label>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSearch}
                disabled={isSearching || !city.trim()}
                className="w-full"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search for Prospects
                  </>
                )}
              </Button>
            </TabsContent>

            {/* URL Scraper Tab */}
            <TabsContent value="scraper" className="space-y-4">
              <div className="space-y-2">
                <Label>Article URL</Label>
                <Input
                  placeholder="e.g., https://austin.eater.com/maps/best-new-restaurants-austin"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                />
                <p className="text-xs text-muted-foreground">
                  Paste a link to an article like &quot;Best Restaurants in Austin&quot; and we&apos;ll extract the business names
                </p>
              </div>

              <Button
                onClick={handleScrape}
                disabled={isScraping || !scrapeUrl.trim()}
                className="w-full"
              >
                {isScraping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting businesses...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Extract Businesses from URL
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* API Search Results */}
      {results.length > 0 && activeTab === 'api' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  Found {results.length} prospects. Select the ones you want to import.
                </CardDescription>
              </div>
              {selectedResults.size > 0 && (
                <Button onClick={handleAddSelected}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add {selectedResults.size} Selected
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedResults.has(index)
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => toggleResult(index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold">{result.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {result.source}
                        </Badge>
                        {result.rating && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{result.rating}</span>
                            {result.reviewCount && (
                              <span className="text-muted-foreground">
                                ({result.reviewCount})
                              </span>
                            )}
                          </div>
                        )}
                        {result.price && (
                          <Badge variant="secondary" className="text-xs">
                            {result.price}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {result.address.street && (
                          <p>
                            {result.address.street}
                            {result.address.city && `, ${result.address.city}`}
                            {result.address.state && `, ${result.address.state}`}
                            {result.address.zip && ` ${result.address.zip}`}
                          </p>
                        )}
                        {result.phone && <p>📞 {result.phone}</p>}
                        {result.website && (
                          <a
                            href={result.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Website
                          </a>
                        )}
                        {(result.categories || result.types) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(result.categories || result.types || []).slice(0, 3).map((cat, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <input
                        type="checkbox"
                        checked={selectedResults.has(index)}
                        onChange={() => toggleResult(index)}
                        className="h-4 w-4"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* URL Scraper Results */}
      {scrapeResults.length > 0 && activeTab === 'scraper' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Extracted Businesses</CardTitle>
                <CardDescription>
                  Found {scrapeResults.length} businesses. Select the ones you want to import.
                </CardDescription>
              </div>
              {selectedScrapeResults.size > 0 && (
                <Button onClick={handleAddScrapeSelected}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add {selectedScrapeResults.size} Selected
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scrapeResults.map((result, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedScrapeResults.has(index)
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => toggleScrapeResult(index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold">{result.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          web_scraper
                        </Badge>
                        {result.categories && result.categories.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {result.categories[0]}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {result.address?.city && (
                          <p>
                            {result.address.street && `${result.address.street}, `}
                            {result.address.city}
                            {result.address.state && `, ${result.address.state}`}
                          </p>
                        )}
                        {result.phone && <p>📞 {result.phone}</p>}
                        {result.website && (
                          <a
                            href={result.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Website
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <input
                        type="checkbox"
                        checked={selectedScrapeResults.has(index)}
                        onChange={() => toggleScrapeResult(index)}
                        className="h-4 w-4"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

