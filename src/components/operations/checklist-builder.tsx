'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  Sparkles,
  ListChecks,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { cn } from '@/lib/utils'

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

type DeleteTarget =
  | { type: 'section'; sectionId: string; label: string }
  | { type: 'item'; sectionId: string; itemId: string; label: string }

/** Segmented control — bordered inline-flex, active segment bg-secondary + semibold. */
function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string }>
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-stretch overflow-hidden rounded-[9px] border border-border', className)}>
      {options.map((option, index) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'px-3 py-1.5 text-xs transition-colors',
            index < options.length - 1 && 'border-r border-border',
            value === option.value
              ? 'bg-secondary font-semibold text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
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
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

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

  const confirmDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'section') {
      deleteSection(deleteTarget.sectionId)
    } else {
      deleteItem(deleteTarget.sectionId, deleteTarget.itemId)
    }
    setDeleteTarget(null)
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
      {/* Sticky builder header — back arrow + record title, EN/Español
          segmented toggle, AI Translate All (outline), Save (the one gold). */}
      <div className="sticky top-0 z-10 -mx-1 border-b border-border bg-background/95 px-1 pb-3 pt-1 backdrop-blur">
        <PageHeader
          className="mb-0"
          kicker="OPERATIONS · CHECKLIST BUILDER"
          title={template.name}
          subtitle={
            [template.nameEs, template.description].filter(Boolean).join(' · ') || undefined
          }
          backHref="/operations/checklists"
          actions={
            <>
              <Segmented
                value={previewLanguage}
                onChange={(v) => setPreviewLanguage(v)}
                options={[
                  { value: 'en', label: 'EN' },
                  { value: 'es', label: 'Español' },
                ]}
              />
              <Button onClick={handleTranslateAll} disabled={translating} variant="outline">
                <Sparkles className="size-4" />
                {translating ? 'Translating...' : 'AI Translate All'}
              </Button>
              <Button onClick={handleSave} disabled={saving} variant="gold">
                <Save className="size-4" />
                {saving ? 'Saving...' : 'Save Checklist'}
              </Button>
            </>
          }
        />
      </div>

      {/* Add Section Dialog */}
      <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Plus className="size-4" />
            Add Section
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Section</DialogTitle>
            <DialogDescription>
              Choose a section type from the library or create a custom section
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Section Type (Optional)</Label>
              <Select
                value={selectedSectionType}
                onValueChange={(value) => {
                  setSelectedSectionType(value)
                  setCustomSectionName('')
                }}
                disabled={loadingLibrary}
              >
                <SelectTrigger className="mt-1.5 w-full">
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
                <SelectContent>
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
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Run: <code className="rounded bg-secondary px-1 font-mono">npx tsx scripts/seed-checklist-library.ts</code>
                </p>
              )}
            </div>
            <div>
              <Label>Or Custom Section Name</Label>
              <Input
                value={customSectionName}
                onChange={(e) => {
                  setCustomSectionName(e.target.value)
                  setSelectedSectionType('')
                }}
                placeholder="e.g., Special Equipment"
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddSectionOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addSection} variant="gold">Add Section</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {sections.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={ListChecks}
              title="No sections yet — every great checklist starts with one"
              description="Pull a ready-made section from the library or name your own, then add the items your crews will check off."
              action={
                <Button variant="outline" onClick={() => setAddSectionOpen(true)}>
                  <Plus className="size-4" />
                  Add First Section
                </Button>
              }
            />
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
              <Card key={section.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2">
                        <GripVertical className="size-4 cursor-grab text-muted-foreground/70" />
                        <span className="kicker text-muted-foreground">
                          Section {sectionIndex + 1}
                        </span>
                      </div>
                      {/* Bilingual field pair — EN + ES side-by-side, 1fr/1fr */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Section Name (English) *</Label>
                          <Input
                            value={section.name}
                            onChange={(e) =>
                              updateSection(section.id, { name: e.target.value })
                            }
                            placeholder="e.g., Kitchen Equipment"
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label>Section Name (Spanish)</Label>
                          <Input
                            value={section.nameEs || ''}
                            onChange={(e) =>
                              updateSection(section.id, { nameEs: e.target.value })
                            }
                            placeholder="e.g., Equipamiento de Cocina"
                            className="mt-1.5"
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete section"
                      onClick={() =>
                        setDeleteTarget({
                          type: 'section',
                          sectionId: section.id,
                          label: section.name || `Section ${sectionIndex + 1}`,
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Quick-select panel for library items */}
                  {sectionType && libraryItems.length > 0 && (
                    <div className="rounded-[12px] border border-border bg-secondary/40 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="kicker text-muted-foreground">
                          Popular Items · Click to Add
                        </span>
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
                            <Maximize2 className="size-4" />
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
                                className="flex cursor-pointer items-center space-x-2 rounded-[9px] p-2 transition-colors hover:bg-background"
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
                                <span className="flex-1 cursor-pointer text-sm text-foreground">
                                  {item.text}
                                </span>
                                {item.requiresPhoto && (
                                  <Badge variant="teal">Photo</Badge>
                                )}
                                {item.priority === 'high' && (
                                  <Badge variant="coral">High</Badge>
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
                      <DialogContent className="flex h-[85vh] max-w-4xl flex-col p-0">
                        <DialogHeader className="px-6 pb-4 pt-6">
                          <DialogTitle>
                            Select Items for {section.name}
                          </DialogTitle>
                          <DialogDescription>
                            Choose items from the library to add to this section. You can search and filter items.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden px-6 pb-6">
                          {/* Search */}
                          <div className="relative flex-shrink-0">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
                          <ScrollArea className="min-h-0 flex-1">
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
                                      className="flex cursor-pointer items-start space-x-3 rounded-[12px] border border-border p-3 transition-colors hover:bg-secondary/50"
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
                                        <span className="block cursor-pointer text-sm font-medium text-foreground">
                                          {item.text}
                                        </span>
                                        {item.textEs && (
                                          <p className="text-xs text-muted-foreground">
                                            {item.textEs}
                                          </p>
                                        )}
                                        <div className="mt-2 flex gap-2">
                                          <Badge variant="neutral">
                                            {item.frequency}
                                          </Badge>
                                          {item.requiresPhoto && (
                                            <Badge variant="teal">
                                              Photo Required
                                            </Badge>
                                          )}
                                          {item.priority === 'high' && (
                                            <Badge variant="coral">
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
                          <div className="flex flex-shrink-0 items-center justify-between border-t border-border pt-4">
                            <p className="font-mono text-sm tabular-nums text-muted-foreground">
                              {section.items.length} item{section.items.length !== 1 ? 's' : ''} selected
                            </p>
                            <Button
                              variant="gold"
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
                      <span className="kicker text-muted-foreground">Selected Items</span>
                      {section.items.map((item) => (
                        <div
                          key={item.id}
                          className="space-y-2 rounded-[12px] border border-border bg-background p-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              {/* Bilingual field pair — EN + ES side-by-side, 1fr/1fr */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label>Item Text (English) *</Label>
                                  <Input
                                    value={item.text}
                                    onChange={(e) =>
                                      updateItem(section.id, item.id, {
                                        text: e.target.value,
                                      })
                                    }
                                    placeholder="e.g., Clean exhaust hood"
                                    className="mt-1.5 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label>Item Text (Spanish)</Label>
                                  <Input
                                    value={item.textEs || ''}
                                    onChange={(e) =>
                                      updateItem(section.id, item.id, {
                                        textEs: e.target.value,
                                      })
                                    }
                                    placeholder="e.g., Limpiar campana extractora"
                                    className="mt-1.5 text-sm"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label>Frequency</Label>
                                  <Select
                                    value={item.frequency}
                                    onValueChange={(value: ChecklistItem['frequency']) =>
                                      updateItem(section.id, item.id, { frequency: value })
                                    }
                                  >
                                    <SelectTrigger size="sm" className="mt-1.5 w-full text-xs">
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
                                  <Label>Priority</Label>
                                  <Select
                                    value={item.priority}
                                    onValueChange={(value: ChecklistItem['priority']) =>
                                      updateItem(section.id, item.id, { priority: value })
                                    }
                                  >
                                    <SelectTrigger size="sm" className="mt-1.5 w-full text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="normal">Normal</SelectItem>
                                      <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-end pb-2">
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
                                      className="cursor-pointer"
                                    >
                                      Photo
                                    </Label>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="ml-2"
                              aria-label="Delete item"
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'item',
                                  sectionId: section.id,
                                  itemId: item.id,
                                  label: item.text || 'this item',
                                })
                              }
                            >
                              <Trash2 className="size-4" />
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
                    className="w-full border-dashed"
                  >
                    <Plus className="size-4" />
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
            <div className="kicker mb-1 text-muted-foreground">Live Preview</div>
            <CardTitle>Preview ({previewLanguage === 'en' ? 'English' : 'Español'})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sections.map((section, idx) => (
                <div key={section.id} className="space-y-2">
                  <h3 className="font-display text-[15px] font-bold tracking-[-0.2px] text-foreground">
                    {previewLanguage === 'en' ? section.name : section.nameEs || section.name}
                  </h3>
                  {section.items.length === 0 ? (
                    <p className="text-sm italic text-muted-foreground">No items</p>
                  ) : (
                    <ul className="ml-4 list-inside list-disc space-y-1">
                      {section.items.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-sm">
                          <span>
                            {previewLanguage === 'en' ? item.text : item.textEs || item.text}
                          </span>
                          {item.requiresPhoto && (
                            <Badge variant="teal">Photo</Badge>
                          )}
                          {item.priority === 'high' && (
                            <Badge variant="coral">High Priority</Badge>
                          )}
                          <Badge variant="neutral">{item.frequency}</Badge>
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

      {/* Delete confirmation — the only place red is allowed */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              {deleteTarget?.type === 'section' ? 'Delete this section?' : 'Delete this item?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'section' ? (
                <>
                  &ldquo;{deleteTarget.label}&rdquo; and all of its items will be removed from
                  this checklist. The change is applied when you save.
                </>
              ) : (
                <>
                  &ldquo;{deleteTarget?.label}&rdquo; will be removed from this section. The
                  change is applied when you save.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              <Trash2 className="size-4" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
