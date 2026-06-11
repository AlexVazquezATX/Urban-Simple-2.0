'use client'

import { Pencil, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface EditableCardProps {
  title: string
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  saving: boolean
  // When false, the Edit affordance is hidden (read-only section).
  canEdit?: boolean
  // Label for the view-mode action button (e.g. "Add financial details").
  editLabel?: string
  children: React.ReactNode
}

// Card shell for a detail-page section that can flip between a view and an
// edit state in place. The parent owns `isEditing` and passes the matching
// content as children; this component just renders the chrome (title +
// Edit, or Save/Cancel) so editing happens where the data is displayed —
// no separate modal.
export function EditableCard({
  title,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  saving,
  canEdit = true,
  editLabel = 'Edit',
  children,
}: EditableCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>
          {title}
        </CardTitle>
        {canEdit &&
          (isEditing ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={saving}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="gold"
                size="sm"
                onClick={onSave}
                disabled={saving}
                className="rounded-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              {editLabel}
            </Button>
          ))}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// Labeled field wrapper for edit-mode inputs across the editable sections.
export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
      </Label>
      {children}
    </div>
  )
}

// Read-only "label + value" row used in section view mode.
export function ViewRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="font-medium text-foreground">{children}</div>
    </div>
  )
}
