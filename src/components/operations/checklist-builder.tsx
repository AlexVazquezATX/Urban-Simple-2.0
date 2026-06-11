'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd'
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  Sparkles,
  ListChecks,
  Maximize2,
  Search,
  ChevronDown,
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
  const [name, setName] = useState(template.name || '')
  const [nameEs, setNameEs] = useState(template.nameEs || '')
  const [description, setDescription] = useState(template.description || '')
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
  const [showAllItems, setShowAllItems] = useState<Record<string, boolean>>({})
  const [itemSelectorOpen, setItemSelectorOpen] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  // Items expanded into the full editor; collapsed by default for scannability.
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [showDetails, setShowDetails] = useState(false)
  // Unsaved-changes guard
  const [leaveOpen, setLeaveOpen] = useState(false)

  // Dirty = differs from the last-saved snapshot. Recomputed each render
  // (cheap at this size) so it's always accurate — no manual flag threading.
  const savedSnapshot = useRef(
    JSON.stringify({ name: template.name || '', nameEs: template.nameEs || '', description: template.description || '', sections })
  )
  const dirty =
    JSON.stringify({ name, nameEs, description, sections }) !== savedSnapshot.current

  // Native guard for tab close / refresh while dirty.
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

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

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const handleBack = () => {
    if (dirty) setLeaveOpen(true)
    else router.push('/operations/checklists')
  }

  const onDragEnd = (result: DropResult) => {
    const { source, destination, type } = result
    if (!destination) return

    if (type === 'section') {
      if (source.index === destination.index) return
      setSections((prev) => {
        const next = [...prev]
        const [moved] = next.splice(source.index, 1)
        next.splice(destination.index, 0, moved)
        return next
      })
      return
    }

    // type === 'item' — reorder within or move across sections
    const srcId = source.droppableId.replace('items:', '')
    const dstId = destination.droppableId.replace('items:', '')
    if (srcId === dstId && source.index === destination.index) return
    setSections((prev) => {
      const next = prev.map((s) => ({ ...s, items: [...s.items] }))
      const src = next.find((s) => s.id === srcId)
      const dst = next.find((s) => s.id === dstId)
      if (!src || !dst) return prev
      const [moved] = src.items.splice(source.index, 1)
      dst.items.splice(destination.index, 0, moved)
      return next
    })
  }

  const addSection = () => {
    if (selectedSectionType) {
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
    const newId = `item-${Date.now()}`
    const newItem: ChecklistItem = {
      id: newId,
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
    // New custom items open straight into the editor.
    setExpandedItems((prev) => new Set(prev).add(newId))
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
      const textsToTranslate: Array<{ type: 'section' | 'item'; id: string; text: string }> = []

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
        body: JSON.stringify({ texts, context: 'cleaning_checklist' }),
      })

      if (!response.ok) throw new Error('Translation failed')

      const { translations } = await response.json()

      setSections((prevSections) =>
        prevSections.map((section) => {
          const updatedSection = { ...section }
          if (section.name && !section.nameEs) {
            const idx = textsToTranslate.findIndex(
              (t) => t.type === 'section' && t.id === section.id
            )
            if (idx >= 0 && translations[idx]) updatedSection.nameEs = translations[idx]
          }
          updatedSection.items = section.items.map((item) => {
            if (item.text && !item.textEs) {
              const idx = textsToTranslate.findIndex(
                (t) => t.type === 'item' && t.id === item.id
              )
              if (idx >= 0 && translations[idx]) return { ...item, textEs: translations[idx] }
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
    if (!name.trim()) {
      toast.error('Give your checklist a name first')
      return
    }
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nameEs, description, sections }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }

      // Reset the dirty baseline to the just-saved state.
      savedSnapshot.current = JSON.stringify({ name, nameEs, description, sections })
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

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <div className="space-y-6">
      {/* Sticky builder header — inline-editable title, EN/Español toggle,
          AI Translate All (outline), Save (the one gold). */}
      <div className="sticky top-0 z-20 -mx-1 border-b border-border bg-background/95 px-1 pb-3 pt-1 backdrop-blur">
        <PageHeader
          className="mb-0"
          kicker="OPERATIONS · CHECKLIST BUILDER"
          title={
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Untitled checklist"
              aria-label="Checklist name"
              className="w-full max-w-xl border-b border-transparent bg-transparent font-display text-3xl font-bold tracking-[-0.8px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 hover:border-border focus:border-primary"
            />
          }
          onBack={handleBack}
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
              <Button onClick={handleSave} disabled={saving || !dirty} variant="gold">
                <Save className="size-4" />
                {saving ? 'Saving...' : dirty ? 'Save changes' : 'Saved'}
                {dirty && !saving && (
                  <span className="size-1.5 rounded-full bg-primary-foreground/90" aria-hidden />
                )}
              </Button>
            </>
          }
        />
      </div>

      {/* Meta row: summary + Spanish name / description disclosure */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 -mt-2">
        <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground">
          {sections.length} {sections.length === 1 ? 'section' : 'sections'} · {totalItems}{' '}
          {totalItems === 1 ? 'item' : 'items'}
        </span>
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown className={cn('size-3.5 transition-transform', showDetails && 'rotate-180')} />
          Spanish name &amp; description
          {(nameEs || description) && <span className="size-1.5 rounded-full bg-primary/70" />}
        </button>
      </div>
      {showDetails && (
        <div className="grid gap-4 rounded-[12px] border border-border bg-secondary/30 p-4 md:grid-cols-2">
          <div>
            <Label>Spanish name (optional)</Label>
            <Input
              value={nameEs}
              onChange={(e) => setNameEs(e.target.value)}
              placeholder="Lista de verificación…"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief note about this checklist…"
              className="mt-1.5"
            />
          </div>
        </div>
      )}

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
                        ? 'Loading section types...'
                        : sectionTypes.length === 0
                          ? 'No section types available. Run seed script first.'
                          : 'Select a section type...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {sectionTypes.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      {loadingLibrary
                        ? 'Loading...'
                        : 'No section types available. Please run the seed script.'}
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
              <Button onClick={addSection} variant="gold">
                Add Section
              </Button>
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
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="sections" type="section">
            {(dropProvided) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                className="space-y-4"
              >
                {sections.map((section, sectionIndex) => {
                  const sectionType = getSectionTypeForSection(section)
                  const showAll = showAllItems[section.id] || false
                  const libraryItems = sectionType?.items || []
                  const selectedItemIds = new Set(
                    section.items
                      .map((item) => {
                        const match = libraryItems.find((li) => li.text === item.text)
                        return match?.id
                      })
                      .filter(Boolean)
                  )

                  return (
                    <Draggable key={section.id} draggableId={section.id} index={sectionIndex}>
                      {(sectionProvided, sectionSnapshot) => (
                        <Card
                          ref={sectionProvided.innerRef}
                          {...sectionProvided.draggableProps}
                          className={cn(
                            sectionSnapshot.isDragging && 'ring-2 ring-primary/30 shadow-elevated'
                          )}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-1 items-start gap-2">
                                <button
                                  type="button"
                                  {...sectionProvided.dragHandleProps}
                                  aria-label="Drag to reorder section"
                                  className="mt-2 cursor-grab text-muted-foreground/60 transition-colors hover:text-foreground active:cursor-grabbing"
                                >
                                  <GripVertical className="size-4" />
                                </button>
                                <div className="flex-1 space-y-4">
                                  <span className="kicker text-muted-foreground">
                                    Section {sectionIndex + 1}
                                  </span>
                                  {/* Bilingual field pair — EN + ES side-by-side */}
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
                                    {(showAll ? libraryItems : libraryItems.slice(0, 10)).map(
                                      (item) => {
                                        const isSelected = selectedItemIds.has(item.id)
                                        return (
                                          <div
                                            key={item.id}
                                            className="flex cursor-pointer items-center space-x-2 rounded-[9px] p-2 transition-colors hover:bg-background"
                                            onClick={() => {
                                              if (isSelected) {
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
                                                addItemsFromLibrary(section.id, [item.id])
                                              }
                                            }}
                                          >
                                            <Checkbox checked={isSelected} />
                                            <span className="flex-1 cursor-pointer text-sm text-foreground">
                                              {item.text}
                                            </span>
                                            {item.requiresPhoto && <Badge variant="teal">Photo</Badge>}
                                            {item.priority === 'high' && (
                                              <Badge variant="coral">High</Badge>
                                            )}
                                          </div>
                                        )
                                      }
                                    )}
                                  </div>
                                </ScrollArea>
                              </div>
                            )}

                            {/* Maximized Item Selector Dialog */}
                            {sectionType && libraryItems.length > 0 && (
                              <Dialog
                                open={itemSelectorOpen[section.id] || false}
                                onOpenChange={(open) =>
                                  setItemSelectorOpen({ ...itemSelectorOpen, [section.id]: open })
                                }
                              >
                                <DialogContent className="flex h-[85vh] max-w-4xl flex-col p-0">
                                  <DialogHeader className="px-6 pb-4 pt-6">
                                    <DialogTitle>Select Items for {section.name}</DialogTitle>
                                    <DialogDescription>
                                      Choose items from the library to add to this section. You can
                                      search and filter items.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden px-6 pb-6">
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
                                                    addItemsFromLibrary(section.id, [item.id])
                                                  }
                                                }}
                                              >
                                                <Checkbox checked={isSelected} className="mt-1" />
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
                                                    <Badge variant="neutral">{item.frequency}</Badge>
                                                    {item.requiresPhoto && (
                                                      <Badge variant="teal">Photo Required</Badge>
                                                    )}
                                                    {item.priority === 'high' && (
                                                      <Badge variant="coral">High Priority</Badge>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          })}
                                      </div>
                                    </ScrollArea>
                                    <div className="flex flex-shrink-0 items-center justify-between border-t border-border pt-4">
                                      <p className="font-mono text-sm tabular-nums text-muted-foreground">
                                        {section.items.length} item
                                        {section.items.length !== 1 ? 's' : ''} selected
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

                            {/* Items — compact rows, drag to reorder, click to edit */}
                            {section.items.length > 0 && (
                              <Droppable droppableId={`items:${section.id}`} type="item">
                                {(itemsProvided) => (
                                  <div
                                    ref={itemsProvided.innerRef}
                                    {...itemsProvided.droppableProps}
                                    className="space-y-2"
                                  >
                                    {section.items.map((item, itemIndex) => {
                                      const expanded = expandedItems.has(item.id)
                                      return (
                                        <Draggable key={item.id} draggableId={item.id} index={itemIndex}>
                                          {(itemProvided, itemSnapshot) => (
                                            <div
                                              ref={itemProvided.innerRef}
                                              {...itemProvided.draggableProps}
                                              className={cn(
                                                'rounded-[12px] border border-border bg-background',
                                                itemSnapshot.isDragging &&
                                                  'ring-2 ring-primary/30 shadow-card'
                                              )}
                                            >
                                              {/* Collapsed row */}
                                              <div className="flex items-center gap-2 p-2.5">
                                                <button
                                                  type="button"
                                                  {...itemProvided.dragHandleProps}
                                                  aria-label="Drag to reorder item"
                                                  className="cursor-grab text-muted-foreground/50 transition-colors hover:text-foreground active:cursor-grabbing"
                                                >
                                                  <GripVertical className="size-4" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => toggleItemExpanded(item.id)}
                                                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                                >
                                                  <span
                                                    className={cn(
                                                      'truncate text-sm',
                                                      item.text
                                                        ? 'text-foreground'
                                                        : 'italic text-muted-foreground'
                                                    )}
                                                  >
                                                    {previewLanguage === 'es' && item.textEs
                                                      ? item.textEs
                                                      : item.text || 'Untitled item'}
                                                  </span>
                                                  <span className="flex shrink-0 items-center gap-1.5">
                                                    {item.requiresPhoto && (
                                                      <Badge variant="teal">Photo</Badge>
                                                    )}
                                                    {item.priority === 'high' && (
                                                      <Badge variant="coral">High</Badge>
                                                    )}
                                                    <Badge variant="neutral">{item.frequency}</Badge>
                                                  </span>
                                                </button>
                                                <ChevronDown
                                                  className={cn(
                                                    'size-4 shrink-0 text-muted-foreground transition-transform',
                                                    expanded && 'rotate-180'
                                                  )}
                                                  onClick={() => toggleItemExpanded(item.id)}
                                                />
                                                <Button
                                                  variant="ghost"
                                                  size="icon-sm"
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

                                              {/* Expanded editor */}
                                              {expanded && (
                                                <div className="space-y-2 border-t border-border px-2.5 pb-3 pt-3">
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
                                                        autoFocus={!item.text}
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
                                                          updateItem(section.id, item.id, {
                                                            frequency: value,
                                                          })
                                                        }
                                                      >
                                                        <SelectTrigger
                                                          size="sm"
                                                          className="mt-1.5 w-full text-xs"
                                                        >
                                                          <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          <SelectItem value="daily">Daily</SelectItem>
                                                          <SelectItem value="weekly">Weekly</SelectItem>
                                                          <SelectItem value="monthly">Monthly</SelectItem>
                                                          <SelectItem value="quarterly">
                                                            Quarterly
                                                          </SelectItem>
                                                        </SelectContent>
                                                      </Select>
                                                    </div>
                                                    <div>
                                                      <Label>Priority</Label>
                                                      <Select
                                                        value={item.priority}
                                                        onValueChange={(value: ChecklistItem['priority']) =>
                                                          updateItem(section.id, item.id, {
                                                            priority: value,
                                                          })
                                                        }
                                                      >
                                                        <SelectTrigger
                                                          size="sm"
                                                          className="mt-1.5 w-full text-xs"
                                                        >
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
                                              )}
                                            </div>
                                          )}
                                        </Draggable>
                                      )
                                    })}
                                    {itemsProvided.placeholder}
                                  </div>
                                )}
                              </Droppable>
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
                      )}
                    </Draggable>
                  )
                })}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
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
                          {item.requiresPhoto && <Badge variant="teal">Photo</Badge>}
                          {item.priority === 'high' && <Badge variant="coral">High Priority</Badge>}
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
                  &ldquo;{deleteTarget.label}&rdquo; and all of its items will be removed from this
                  checklist. The change is applied when you save.
                </>
              ) : (
                <>
                  &ldquo;{deleteTarget?.label}&rdquo; will be removed from this section. The change
                  is applied when you save.
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

      {/* Unsaved-changes guard */}
      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this checklist. If you leave now, they&apos;ll be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setLeaveOpen(false)
                router.push('/operations/checklists')
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
