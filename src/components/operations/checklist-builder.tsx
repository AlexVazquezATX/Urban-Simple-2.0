'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  Languages,
  ChevronDown,
  ChevronUp,
  Edit,
  X,
  Maximize2,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ChecklistItem {
  id: string
  text: string
  textEs?: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  requiresPhoto: boolean
  priority: 'normal' | 'high'
}

interface ChecklistSection {
  id: string
  name: string
  nameEs?: string
  items: ChecklistItem[]
  sectionTypeId?: string // Link to library section type
}

interface ChecklistBuilderProps {
  template: {
    id: string
    name: string
    nameEs?: string
    description?: string
    sections: ChecklistSection[]
  }
}

interface SectionType {
  id: string
  name: string
  nameEs?: string
  code: string
  icon?: string
  items: Array<{
    id: string
    text: string
    textEs?: string
    frequency: string
    requiresPhoto: boolean
    priority: string
  }>
}

export function ChecklistBuilder({ template }: ChecklistBuilderProps) {
  const router = useRouter()
  const [sections, setSections] = useState<ChecklistSection[]>(
    Array.isArray(template.sections) ? template.sections : []
  )
  const [previewLanguage, setPreviewLanguage] = useState<'en' | 'es'>('en')
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [sectionTypes, setSectionTypes] = useState<SectionType[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [addSectionOpen, setAddSectionOpen] = useState(false)
  const [selectedSectionType, setSelectedSectionType] = useState<string>('')
  const [customSectionName, setCustomSectionName] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [showAllItems, setShowAllItems] = useState<Record<string, boolean>>({})
  const [itemSelectorOpen, setItemSelectorOpen] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({})

  // Load section types from library
  useEffect(() => {
    loadSectionTypes()
  }, [])

  const loadSectionTypes = async () => {
    setLoadingLibrary(true)
    try {
      const response = await fetch('/api/checklist-library')
      if (response.ok) {
        const data = await response.json()
        setSectionTypes(Array.isArray(data) ? data : [])
      } else {
        const error = await response.json().catch(() => ({ error: 'Failed to load' }))
        console.error('Failed to load section types:', error)
        if (error.error?.includes('model') || error.error?.includes('table')) {
          toast.error('Database tables not set up. Please run migrations first.')
        }
      }
    } catch (error) {
      console.error('Failed to load section types:', error)
      toast.error('Failed to load section types. Check console for details.')
    } finally {
      setLoadingLibrary(false)
    }
  }

  const toggleSectionExpanded = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const addSection = () => {
    if (selectedSectionType) {
      // Add section from library
      const sectionType = sectionTypes.find((st) => st.id === selectedSectionType)
      if (sectionType) {
        const newSection: ChecklistSection = {
          id: `section-${Date.now()}`,
          name: sectionType.name,
          nameEs: sectionType.nameEs,
          items: [],
          sectionTypeId: sectionType.id,
        }
        setSections([...sections, newSection])
        setSelectedSectionType('')
        setCustomSectionName('')
        setAddSectionOpen(false)
        return
      }
    }

    // Add custom section
    if (!customSectionName.trim()) {
      toast.error('Please enter a section name or select a section type')
      return
    }

    const newSection: ChecklistSection = {
      id: `section-${Date.now()}`,
      name: customSectionName.trim(),
      nameEs: '',
      items: [],
    }
    setSections([...sections, newSection])
    setCustomSectionName('')
    setSelectedSectionType('')
    setAddSectionOpen(false)
  }

  const updateSection = (sectionId: string, updates: Partial<ChecklistSection>) => {
    setSections(
      sections.map((section) =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    )
  }

  const deleteSection = (sectionId: string) => {
    setSections(sections.filter((section) => section.id !== sectionId))
  }

  const addItemsFromLibrary = (sectionId: string, itemIds: string[]) => {
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return

    const sectionType = sectionTypes.find((st) => st.id === section.sectionTypeId)
    if (!sectionType) return

    const newItems = itemIds
      .map((itemId) => {
        const libraryItem = sectionType.items.find((i) => i.id === itemId)
        if (!libraryItem) return null

        // Check if item already exists
        const exists = section.items.some((i) => i.text === libraryItem.text)
        if (exists) return null

        return {
          id: `item-${Date.now()}-${Math.random()}`,
          text: libraryItem.text,
          textEs: libraryItem.textEs || '',
          frequency: libraryItem.frequency as ChecklistItem['frequency'],
          requiresPhoto: libraryItem.requiresPhoto,
          priority: libraryItem.priority as ChecklistItem['priority'],
        }
      })
      .filter((item) => item !== null) as ChecklistItem[]

    setSections(
      sections.map((section) =>
        section.id === sectionId
          ? { ...section, items: [...section.items, ...newItems] }
          : section
      )
    )
  }

  const addItem = (sectionId: string) => {
    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      text: '',
      textEs: '',
      frequency: 'daily',
      requiresPhoto: false,
      priority: 'normal',
    }
    setSections(
      sections.map((section) =>
        section.id === sectionId
          ? { ...section, items: [...section.items, newItem] }
          : section
      )
    )
  }

  const updateItem = (
    sectionId: string,
    itemId: string,
    updates: Partial<ChecklistItem>
  ) => {
    setSections(
      sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
            }
          : section
      )
    )
  }

  const deleteItem = (sectionId: string, itemId: string) => {
    setSections(
      sections.map((section) =>
        section.id === sectionId
          ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
          : section
      )
    )
  }

  const handleTranslateAll = async () => {
    setTranslating(true)
    try {
      // Collect all texts that need translation
      const textsToTranslate: Array<{ type: 'section' | 'item'; id: string; text: string }> =
        []

      sections.forEach((section) => {
        if (section.name && !section.nameEs) {
          textsToTranslate.push({ type: 'section', id: section.id, text: section.name })
        }
        section.items.forEach((item) => {
          if (item.text && !item.textEs) {
            textsToTranslate.push({ type: 'item', id: item.id, text: item.text })
          }
        })
      })

      if (textsToTranslate.length === 0) {
        toast.info('All items already have Spanish translations')
        return
      }

      const texts = textsToTranslate.map((t) => t.text)
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts,
          context: 'cleaning_checklist',
        }),
      })

      if (!response.ok) {
        throw new Error('Translation failed')
      }

      const { translations } = await response.json()

      // Update sections and items with translations
      setSections((prevSections) =>
        prevSections.map((section) => {
          let translationIndex = 0
          const updatedSection = { ...section }

          // Translate section name
          if (section.name && !section.nameEs) {
            const idx = textsToTranslate.findIndex(
              (t) => t.type === 'section' && t.id === section.id
            )
            if (idx >= 0 && translations[idx]) {
              updatedSection.nameEs = translations[idx]
            }
          }

          // Translate items
          updatedSection.items = section.items.map((item) => {
            if (item.text && !item.textEs) {
              const idx = textsToTranslate.findIndex(
                (t) => t.type === 'item' && t.id === item.id
              )
              if (idx >= 0 && translations[idx]) {
                return { ...item, textEs: translations[idx] }
              }
            }
            return item
          })

          return updatedSection
        })
      )

      toast.success(`Translated ${translations.length} items`)
    } catch (error: any) {
      console.error('Translation error:', error)
      toast.error(error.message || 'Failed to translate')
    } finally {
      setTranslating(false)
    }
  }

  const handleSave = async () => {
    // Validate sections
    for (const section of sections) {
      if (!section.name.trim()) {
        toast.error('All sections must have a name')
        return
      }
      for (const item of section.items) {
        if (!item.text.trim()) {
          toast.error('All items must have text')
          return
        }
      }
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/checklists/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sections,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }

      toast.success('Checklist saved')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save checklist')
    } finally {
      setSaving(false)
    }
  }

  const getSectionTypeForSection = (section: ChecklistSection) => {
    if (!section.sectionTypeId) return null
    return sectionTypes.find((st) => st.id === section.sectionTypeId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-medium text-warm-900">Build Checklist</h2>
          <p className="text-sm text-warm-500">
            Add sections and items to create your checklist template
          </p>
        </div>
        <div className="flex gap-2">
          <Tabs
            value={previewLanguage}
            onValueChange={(v) => setPreviewLanguage(v as 'en' | 'es')}
          >
            <TabsList className="rounded-sm bg-warm-100">
              <TabsTrigger value="en" className="rounded-sm data-[state=active]:bg-white">English</TabsTrigger>
              <TabsTrigger value="es" className="rounded-sm data-[state=active]:bg-white">Español</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={handleTranslateAll} disabled={translating} variant="outline" className="rounded-sm">
            <Languages className="mr-2 h-4 w-4" />
            {translating ? 'Translating...' : 'AI Translate All'}
          </Button>
          <Button onClick={handleSave} disabled={saving} variant="lime" className="rounded-sm">
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Checklist'}
          </Button>
        </div>
      </div>

      {/* Add Section Dialog */}
      <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="rounded-sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </DialogTrigger>
        <DialogContent className="rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-display font-medium text-warm-900">Add Section</DialogTitle>
            <DialogDescription className="text-sm text-warm-500">
              Choose a section type from the library or create a custom section
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-warm-700">Section Type (Optional)</Label>
              <Select
                value={selectedSectionType}
                onValueChange={(value) => {
                  setSelectedSectionType(value)
                  setCustomSectionName('')
                }}
                disabled={loadingLibrary}
              >
                <SelectTrigger className="rounded-sm border-warm-200 mt-1">
                  <SelectValue
                    placeholder={
                      loadingLibrary
                        ? "Loading section types..."
                        : sectionTypes.length === 0
                        ? "No section types available. Run seed script first."
                        : "Select a section type..."
                    }
                  />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  {sectionTypes.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      {loadingLibrary
                        ? "Loading..."
                        : "No section types available. Please run the seed script."}
                    </SelectItem>
                  ) : (
                    sectionTypes.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {sectionTypes.length === 0 && !loadingLibrary && (
                <p className="text-xs text-warm-500 mt-1">
                  Run: <code className="bg-warm-100 px-1 rounded-sm">npx tsx scripts/seed-checklist-library.ts</code>
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium text-warm-700">Or Custom Section Name</Label>
              <Input
                value={customSectionName}
                onChange={(e) => {
                  setCustomSectionName(e.target.value)
                  setSelectedSectionType('')
                }}
                placeholder="e.g., Special Equipment"
                className="rounded-sm border-warm-200 mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddSectionOpen(false)} className="rounded-sm">
                Cancel
              </Button>
              <Button onClick={addSection} variant="lime" className="rounded-sm">Add Section</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {sections.length === 0 ? (
        <Card className="rounded-sm border-warm-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-warm-500 mb-4">No sections yet</p>
            <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
              <DialogTrigger asChild>
                <Button variant="lime" className="rounded-sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Section
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section, sectionIndex) => {
            const sectionType = getSectionTypeForSection(section)
            const isExpanded = expandedSections.has(section.id)
            const showAll = showAllItems[section.id] || false
            const libraryItems = sectionType?.items || []
            const selectedItemIds = new Set(
              section.items.map((item) => {
                const match = libraryItems.find((li) => li.text === item.text)
                return match?.id
              }).filter(Boolean)
            )

            return (
              <Card key={section.id} className="rounded-sm border-warm-200">
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-5 w-5 text-warm-400" />
                        <span className="text-sm font-medium text-warm-500">
                          Section {sectionIndex + 1}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-medium text-warm-700">Section Name (English) *</Label>
                          <Input
                            value={section.name}
                            onChange={(e) =>
                              updateSection(section.id, { name: e.target.value })
                            }
                            placeholder="e.g., Kitchen Equipment"
                            className="rounded-sm border-warm-200 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-warm-700">Section Name (Spanish)</Label>
                          <Input
                            value={section.nameEs || ''}
                            onChange={(e) =>
                              updateSection(section.id, { nameEs: e.target.value })
                            }
                            placeholder="e.g., Equipamiento de Cocina"
                            className="rounded-sm border-warm-200 mt-1"
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSection(section.id)}
                      className="rounded-sm"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                  {/* Quick-select panel for library items */}
                  {sectionType && libraryItems.length > 0 && (
                    <div className="border border-warm-200 rounded-sm p-4 bg-warm-50">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-semibold">
                          Popular Items (click to add)
                        </Label>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setShowAllItems({
                                ...showAllItems,
                                [section.id]: !showAllItems[section.id],
                              })
                            }
                          >
                            {showAll ? 'Show Less' : `Show All ${libraryItems.length} Items`}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setItemSelectorOpen({
                                ...itemSelectorOpen,
                                [section.id]: true,
                              })
                            }
                          >
                            <Maximize2 className="h-4 w-4 mr-1" />
                            Open Selector
                          </Button>
                        </div>
                      </div>
                      <ScrollArea className="h-[200px] pr-4">
                        <div className="space-y-2">
                          {(showAll
                            ? libraryItems
                            : libraryItems.slice(0, 10)
                          ).map((item) => {
                            const isSelected = selectedItemIds.has(item.id)
                            return (
                              <div
                                key={item.id}
                                className="flex items-center space-x-2 p-2 rounded hover:bg-background cursor-pointer"
                                onClick={() => {
                                  if (isSelected) {
                                    // Remove item
                                    setSections(
                                      sections.map((s) =>
                                        s.id === section.id
                                          ? {
                                              ...s,
                                              items: s.items.filter(
                                                (i) => i.text !== item.text
                                              ),
                                            }
                                          : s
                                      )
                                    )
                                  } else {
                                    // Add item
                                    addItemsFromLibrary(section.id, [item.id])
                                  }
                                }}
                              >
                                <Checkbox checked={isSelected} />
                                <Label className="flex-1 cursor-pointer text-sm">
                                  {item.text}
                                </Label>
                                {item.requiresPhoto && (
                                  <Badge variant="outline" className="text-xs">
                                    Photo
                                  </Badge>
                                )}
                                {item.priority === 'high' && (
                                  <Badge variant="destructive" className="text-xs">
                                    High
                                  </Badge>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Maximized Item Selector Dialog */}
                  {sectionType && libraryItems.length > 0 && (
                    <Dialog
                      open={itemSelectorOpen[section.id] || false}
                      onOpenChange={(open) =>
                        setItemSelectorOpen({
                          ...itemSelectorOpen,
                          [section.id]: open,
                        })
                      }
                    >
                      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
                        <DialogHeader className="px-6 pt-6 pb-4">
                          <DialogTitle>
                            Select Items for {section.name}
                          </DialogTitle>
                          <DialogDescription>
                            Choose items from the library to add to this section. You can search and filter items.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 flex flex-col min-h-0 px-6 pb-6 space-y-4 overflow-hidden">
                          {/* Search */}
                          <div className="relative flex-shrink-0">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search items..."
                              value={searchQuery[section.id] || ''}
                              onChange={(e) =>
                                setSearchQuery({
                                  ...searchQuery,
                                  [section.id]: e.target.value,
                                })
                              }
                              className="pl-9"
                            />
                          </div>
                          {/* Items List */}
                          <ScrollArea className="flex-1 min-h-0">
                            <div className="space-y-2 pr-4">
                              {libraryItems
                                .filter((item) => {
                                  const query = (searchQuery[section.id] || '').toLowerCase()
                                  if (!query) return true
                                  return (
                                    item.text.toLowerCase().includes(query) ||
                                    item.textEs?.toLowerCase().includes(query)
                                  )
                                })
                                .map((item) => {
                                  const isSelected = selectedItemIds.has(item.id)
                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                                      onClick={() => {
                                        if (isSelected) {
                                          // Remove item
                                          setSections(
                                            sections.map((s) =>
                                              s.id === section.id
                                                ? {
                                                    ...s,
                                                    items: s.items.filter(
                                                      (i) => i.text !== item.text
                                                    ),
                                                  }
                                                : s
                                            )
                                          )
                                        } else {
                                          // Add item
                                          addItemsFromLibrary(section.id, [item.id])
                                        }
                                      }}
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        className="mt-1"
                                        onCheckedChange={() => {
                                          // Handled by parent div onClick
                                        }}
                                      />
                                      <div className="flex-1 space-y-1">
                                        <Label className="cursor-pointer text-sm font-medium">
                                          {item.text}
                                        </Label>
                                        {item.textEs && (
                                          <p className="text-xs text-muted-foreground">
                                            {item.textEs}
                                          </p>
                                        )}
                                        <div className="flex gap-2 mt-2">
                                          <Badge variant="secondary" className="text-xs">
                                            {item.frequency}
                                          </Badge>
                                          {item.requiresPhoto && (
                                            <Badge variant="outline" className="text-xs">
                                              Photo Required
                                            </Badge>
                                          )}
                                          {item.priority === 'high' && (
                                            <Badge variant="destructive" className="text-xs">
                                              High Priority
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                          </ScrollArea>
                          {/* Footer with selected count */}
                          <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
                            <p className="text-sm text-muted-foreground">
                              {section.items.length} item{section.items.length !== 1 ? 's' : ''} selected
                            </p>
                            <Button
                              onClick={() =>
                                setItemSelectorOpen({
                                  ...itemSelectorOpen,
                                  [section.id]: false,
                                })
                              }
                            >
                              Done
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {/* Selected Items */}
                  {section.items.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Selected Items</Label>
                      {section.items.map((item) => (
                        <div
                          key={item.id}
                          className="border rounded-lg p-3 bg-background space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Item Text (English) *</Label>
                                  <Input
                                    value={item.text}
                                    onChange={(e) =>
                                      updateItem(section.id, item.id, {
                                        text: e.target.value,
                                      })
                                    }
                                    placeholder="e.g., Clean exhaust hood"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Item Text (Spanish)</Label>
                                  <Input
                                    value={item.textEs || ''}
                                    onChange={(e) =>
                                      updateItem(section.id, item.id, {
                                        textEs: e.target.value,
                                      })
                                    }
                                    placeholder="e.g., Limpiar campana extractora"
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs">Frequency</Label>
                                  <Select
                                    value={item.frequency}
                                    onValueChange={(value: ChecklistItem['frequency']) =>
                                      updateItem(section.id, item.id, { frequency: value })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="daily">Daily</SelectItem>
                                      <SelectItem value="weekly">Weekly</SelectItem>
                                      <SelectItem value="monthly">Monthly</SelectItem>
                                      <SelectItem value="quarterly">Quarterly</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Priority</Label>
                                  <Select
                                    value={item.priority}
                                    onValueChange={(value: ChecklistItem['priority']) =>
                                      updateItem(section.id, item.id, { priority: value })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="normal">Normal</SelectItem>
                                      <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-end">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`photo-${item.id}`}
                                      checked={item.requiresPhoto}
                                      onCheckedChange={(checked) =>
                                        updateItem(section.id, item.id, {
                                          requiresPhoto: checked === true,
                                        })
                                      }
                                    />
                                    <Label
                                      htmlFor={`photo-${item.id}`}
                                      className="text-xs cursor-pointer"
                                    >
                                      Photo
                                    </Label>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="ml-2 h-8 w-8"
                              onClick={() => deleteItem(section.id, item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Custom Item */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addItem(section.id)}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Custom Item
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Preview */}
      {sections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview ({previewLanguage === 'en' ? 'English' : 'Español'})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sections.map((section, idx) => (
                <div key={section.id} className="space-y-2">
                  <h3 className="font-semibold">
                    {previewLanguage === 'en' ? section.name : section.nameEs || section.name}
                  </h3>
                  {section.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No items</p>
                  ) : (
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      {section.items.map((item) => (
                        <li key={item.id} className="text-sm flex items-center gap-2">
                          <span>
                            {previewLanguage === 'en' ? item.text : item.textEs || item.text}
                          </span>
                          {item.requiresPhoto && (
                            <Badge variant="outline" className="text-xs">
                              Photo
                            </Badge>
                          )}
                          {item.priority === 'high' && (
                            <Badge variant="destructive" className="text-xs">
                              High Priority
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {item.frequency}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                  {idx < sections.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
