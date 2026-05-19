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
  children,
}: EditableCardProps) {
  return (
    <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">
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
                className="rounded-sm text-warm-600 hover:bg-warm-50 hover:text-warm-900 dark:text-cream-400 dark:hover:bg-charcoal-800"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="lime"
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
              className="rounded-sm text-warm-600 hover:bg-warm-50 hover:text-ocean-600 dark:text-cream-400 dark:hover:bg-charcoal-800"
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
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
      <Label className="text-xs font-medium uppercase tracking-wider text-warm-500 dark:text-cream-400">
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
      <p className="text-sm text-warm-500 dark:text-cream-400">{label}</p>
      <div className="font-medium text-warm-900 dark:text-cream-100">{children}</div>
    </div>
  )
}
