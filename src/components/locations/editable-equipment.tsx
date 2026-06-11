'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { EditableCard } from '@/components/ui/editable-card'
import { EmptyState } from '@/components/ui/empty-state'

interface EditableEquipmentProps {
  location: any
}

type EquipmentItem = string | { name?: string | null }

function toText(inv: unknown): string {
  if (!Array.isArray(inv)) return ''
  return (inv as EquipmentItem[])
    .map((i) => (typeof i === 'string' ? i : i?.name || ''))
    .filter((s) => s.trim().length > 0)
    .join('\n')
}

export function EditableEquipment({ location }: EditableEquipmentProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [text, setText] = useState(() => toText(location.equipmentInventory))

  const startEdit = () => {
    setText(toText(location.equipmentInventory))
    setIsEditing(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const equipmentInventory = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .map((name) => ({ name }))
      const res = await fetch(`/api/locations/${location.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentInventory }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update equipment')
      }
      toast.success('Equipment updated')
      setIsEditing(false)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const items = (
    Array.isArray(location.equipmentInventory) ? location.equipmentInventory : []
  ) as EquipmentItem[]

  return (
    <EditableCard
      title="Equipment Inventory"
      isEditing={isEditing}
      onEdit={startEdit}
      onCancel={() => setIsEditing(false)}
      onSave={save}
      saving={saving}
    >
      {isEditing ? (
        <div className="space-y-1.5">
          <Textarea
            rows={6}
            className="resize-none font-mono text-sm"
            placeholder={'Hood 1\nFryer 1\nGrill...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">One item per line.</p>
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-[10px] border border-border p-2 transition-colors hover:border-primary/40"
            >
              <Wrench className="size-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                {typeof item === 'string' ? item : item?.name || 'Unknown'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Wrench}
          title="No equipment on file"
          description="Use Edit to list the hoods, fryers, and other gear at this location — one item per line."
          className="py-8"
        />
      )}
    </EditableCard>
  )
}
