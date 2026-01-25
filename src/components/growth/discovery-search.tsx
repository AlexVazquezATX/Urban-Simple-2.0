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
    <div className="space-y-4">
      <Card className="rounded-sm border-warm-200">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-base font-display font-medium text-warm-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-lime-600" />
            AI Discovery
          </CardTitle>
          <CardDescription className="text-xs text-warm-500">
            Find prospects using APIs or extract from web pages
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 rounded-sm bg-warm-100 p-1">
              <TabsTrigger value="api" className="flex items-center gap-1.5 text-xs rounded-sm data-[state=active]:bg-white">
                <Globe className="h-3.5 w-3.5" />
                API Search
              </TabsTrigger>
              <TabsTrigger value="scraper" className="flex items-center gap-1.5 text-xs rounded-sm data-[state=active]:bg-white">
                <Link2 className="h-3.5 w-3.5" />
                URL Scraper
              </TabsTrigger>
            </TabsList>

            {/* API Search Tab */}
            <TabsContent value="api" className="space-y-4 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-warm-700">City *</Label>
                  <Input
                    placeholder="e.g., Austin"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="h-8 text-sm rounded-sm border-warm-200 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-warm-700">State</Label>
                  <Input
                    placeholder="e.g., TX"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="h-8 text-sm rounded-sm border-warm-200 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-warm-700">Facility Type</Label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full h-8 px-2 border border-warm-200 rounded-sm bg-white text-xs mt-1"
                  >
                    {FACILITY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-warm-700">Price Level</Label>
                  <select
                    value={priceLevel}
                    onChange={(e) => setPriceLevel(e.target.value)}
                    className="w-full h-8 px-2 border border-warm-200 rounded-sm bg-white text-xs mt-1"
                  >
                    {PRICE_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-warm-700">Minimum Rating</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.5"
                    placeholder="e.g., 4.0"
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    className="h-8 text-sm rounded-sm border-warm-200 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-warm-700">Data Sources</Label>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1.5">
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
                      <label htmlFor="google" className="text-xs text-warm-700">Google</label>
                    </div>
                    <div className="flex items-center gap-1.5">
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
                      <label htmlFor="yelp" className="text-xs text-warm-700">Yelp</label>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSearch}
                disabled={isSearching || !city.trim()}
                variant="lime"
                className="w-full rounded-sm"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-1.5 h-3.5 w-3.5" />
                    Search for Prospects
                  </>
                )}
              </Button>
            </TabsContent>

            {/* URL Scraper Tab */}
            <TabsContent value="scraper" className="space-y-4 mt-0">
              <div className="space-y-1.5">
                <Label className="text-xs text-warm-700">Article URL</Label>
                <Input
                  placeholder="e.g., https://austin.eater.com/maps/best-new-restaurants-austin"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                  className="h-8 text-sm rounded-sm border-warm-200"
                />
                <p className="text-[10px] text-warm-500">
                  Paste a link to an article like &quot;Best Restaurants in Austin&quot; and we&apos;ll extract the business names
                </p>
              </div>

              <Button
                onClick={handleScrape}
                disabled={isScraping || !scrapeUrl.trim()}
                variant="lime"
                className="w-full rounded-sm"
              >
                {isScraping ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Extracting businesses...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-1.5 h-3.5 w-3.5" />
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
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-display font-medium text-warm-900">Search Results</CardTitle>
                <CardDescription className="text-xs text-warm-500">
                  Found {results.length} prospects. Select the ones you want to import.
                </CardDescription>
              </div>
              {selectedResults.size > 0 && (
                <Button onClick={handleAddSelected} variant="lime" size="sm" className="rounded-sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add {selectedResults.size} Selected
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-1.5">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`rounded-sm border p-3 cursor-pointer transition-colors ${
                    selectedResults.has(index)
                      ? 'border-lime-400 bg-lime-50'
                      : 'border-warm-200 hover:border-ocean-400'
                  }`}
                  onClick={() => toggleResult(index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <h3 className="text-sm font-medium text-warm-900">{result.name}</h3>
                        <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300">
                          {result.source}
                        </Badge>
                        {result.rating && (
                          <div className="flex items-center gap-0.5 text-xs">
                            <Star className="h-3 w-3 fill-lime-500 text-lime-500" />
                            <span className="text-warm-700">{result.rating}</span>
                            {result.reviewCount && (
                              <span className="text-warm-500">
                                ({result.reviewCount})
                              </span>
                            )}
                          </div>
                        )}
                        {result.price && (
                          <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-lime-100 text-lime-700 border-lime-200">
                            {result.price}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-0.5 text-xs text-warm-600">
                        {result.address.street && (
                          <p>
                            {result.address.street}
                            {result.address.city && `, ${result.address.city}`}
                            {result.address.state && `, ${result.address.state}`}
                            {result.address.zip && ` ${result.address.zip}`}
                          </p>
                        )}
                        {result.phone && <p>{result.phone}</p>}
                        {result.website && (
                          <a
                            href={result.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-ocean-600 hover:text-ocean-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Website
                          </a>
                        )}
                        {(result.categories || result.types) && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(result.categories || result.types || []).slice(0, 3).map((cat, i) => (
                              <Badge key={i} className="rounded-sm text-[10px] px-1.5 py-0 bg-warm-100 text-warm-600 border-warm-200">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-3">
                      <Checkbox
                        checked={selectedResults.has(index)}
                        onCheckedChange={() => toggleResult(index)}
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
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-display font-medium text-warm-900">Extracted Businesses</CardTitle>
                <CardDescription className="text-xs text-warm-500">
                  Found {scrapeResults.length} businesses. Select the ones you want to import.
                </CardDescription>
              </div>
              {selectedScrapeResults.size > 0 && (
                <Button onClick={handleAddScrapeSelected} variant="lime" size="sm" className="rounded-sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add {selectedScrapeResults.size} Selected
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-1.5">
              {scrapeResults.map((result, index) => (
                <div
                  key={index}
                  className={`rounded-sm border p-3 cursor-pointer transition-colors ${
                    selectedScrapeResults.has(index)
                      ? 'border-lime-400 bg-lime-50'
                      : 'border-warm-200 hover:border-ocean-400'
                  }`}
                  onClick={() => toggleScrapeResult(index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <h3 className="text-sm font-medium text-warm-900">{result.name}</h3>
                        <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300">
                          web_scraper
                        </Badge>
                        {result.categories && result.categories.length > 0 && (
                          <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-warm-100 text-warm-600 border-warm-200">
                            {result.categories[0]}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-0.5 text-xs text-warm-600">
                        {result.address?.city && (
                          <p>
                            {result.address.street && `${result.address.street}, `}
                            {result.address.city}
                            {result.address.state && `, ${result.address.state}`}
                          </p>
                        )}
                        {result.phone && <p>{result.phone}</p>}
                        {result.website && (
                          <a
                            href={result.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-ocean-600 hover:text-ocean-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Website
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="ml-3">
                      <Checkbox
                        checked={selectedScrapeResults.has(index)}
                        onCheckedChange={() => toggleScrapeResult(index)}
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
