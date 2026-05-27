'use client'

import { useMemo, useState } from 'react'
import { Loader2, Check, X, AlertCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ACTION_REF_PREFIX,
  type ActionApplyResult,
  type ActionEntity,
  type ActionField,
  type ProposedAction,
  type ProposedActionSet,
} from '../../types/action-types'
import { executeActionChain } from '../../lib/action-executor'

interface ProposedActionCardProps {
  set: ProposedActionSet
  // The original user prompt — kept around so we can log it with the audit
  // entry on Apply. Not displayed.
  userPrompt: string
  // Called after a successful Apply (used by the chat sidebar to refresh the
  // user-visible parts of the app if needed). Optional.
  onApplied?: (results: ActionApplyResult[]) => void
}

type ApplyState = 'idle' | 'applying' | 'done' | 'failed' | 'cancelled'

const ENTITY_LABELS: Record<ActionEntity, string> = {
  client: 'Client',
  location: 'Location',
  service_agreement: 'Service Agreement',
  recurring_expense: 'Recurring Expense',
}

export function ProposedActionCard({
  set,
  userPrompt,
  onApplied,
}: ProposedActionCardProps) {
  // Mutable local copy of the action set so the user can edit field values
  // before applying. Editing after apply is disabled.
  const [actions, setActions] = useState<ProposedAction[]>(() =>
    set.actions.map((a) => ({
      ...a,
      fields: a.fields.map((f) => ({ ...f })),
    }))
  )
  const [applyState, setApplyState] = useState<ApplyState>('idle')
  const [results, setResults] = useState<ActionApplyResult[]>(() =>
    set.actions.map((a) => ({ actionId: a.id, status: 'pending' as const }))
  )

  const isLocked = applyState !== 'idle'
  const successCount = results.filter((r) => r.status === 'success').length
  const failureCount = results.filter((r) => r.status === 'failure').length

  const onFieldChange = (
    actionId: string,
    fieldKey: string,
    newValue: ActionField['newValue']
  ) => {
    setActions((prev) =>
      prev.map((a) =>
        a.id !== actionId
          ? a
          : {
              ...a,
              fields: a.fields.map((f) =>
                f.key === fieldKey ? { ...f, newValue } : f
              ),
            }
      )
    )
  }

  const onApply = async () => {
    setApplyState('applying')
    try {
      const finalResults = await executeActionChain(
        { ...set, actions },
        { onProgress: (rs) => setResults([...rs]) }
      )
      setResults(finalResults)
      const failed = finalResults.some((r) => r.status === 'failure')
      setApplyState(failed ? 'failed' : 'done')

      // Fire-and-forget audit log for the chain. Audit must never block or
      // undo a successful change, so errors are swallowed silently.
      fetch('/api/ai/log-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          actions: actions.map((a) => ({
            id: a.id,
            kind: a.kind,
            entity: a.entity,
            targetId: a.targetId ?? null,
            targetLabel: a.targetLabel,
            fields: a.fields.map((f) => ({ key: f.key, value: f.newValue })),
          })),
          results: finalResults,
        }),
      }).catch(() => {})

      if (failed) {
        const firstError = finalResults.find((r) => r.status === 'failure')?.error
        toast.error(firstError || 'Some changes did not apply')
      } else {
        toast.success(
          finalResults.length === 1
            ? 'Change applied'
            : `Applied ${finalResults.length} changes`
        )
      }
      onApplied?.(finalResults)
    } catch (e: any) {
      setApplyState('failed')
      toast.error(e?.message || 'Something went wrong')
    }
  }

  const onCancel = () => setApplyState('cancelled')

  return (
    <div className="rounded-sm border-2 border-ocean-300 bg-white p-3 dark:border-ocean-700 dark:bg-charcoal-900">
      <div className="mb-2 flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ocean-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-warm-900 dark:text-cream-100">
            {set.summary}
          </p>
          {set.derived && (
            <p className="mt-0.5 text-xs text-warm-500 dark:text-cream-400">
              {set.derived}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {actions.map((action, idx) => (
          <ActionSection
            key={action.id}
            action={action}
            status={results[idx]?.status ?? 'pending'}
            errorMessage={results[idx]?.error}
            disabled={isLocked}
            onChange={(key, value) => onFieldChange(action.id, key, value)}
          />
        ))}
      </div>

      {applyState === 'idle' && (
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-warm-200 pt-2.5 dark:border-charcoal-700">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="rounded-sm"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="lime"
            size="sm"
            onClick={onApply}
            className="rounded-sm"
          >
            Apply {actions.length > 1 ? `All (${actions.length})` : ''}
          </Button>
        </div>
      )}

      {applyState === 'applying' && (
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-warm-200 pt-2.5 text-xs text-warm-500 dark:border-charcoal-700 dark:text-cream-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Applying…
        </div>
      )}

      {applyState === 'done' && (
        <div className="mt-3 flex items-center gap-2 border-t border-lime-200 pt-2.5 text-sm text-lime-700 dark:border-lime-900">
          <Check className="h-4 w-4" />
          <span>
            Done — {successCount === 1 ? '1 change' : `${successCount} changes`} applied.
          </span>
        </div>
      )}

      {applyState === 'failed' && (
        <div className="mt-3 flex items-start gap-2 border-t border-red-200 pt-2.5 text-sm text-red-700 dark:border-red-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Stopped at the first failure — {successCount} applied, {failureCount} failed,{' '}
            {results.length - successCount - failureCount} skipped.
          </span>
        </div>
      )}

      {applyState === 'cancelled' && (
        <div className="mt-3 border-t border-warm-200 pt-2.5 text-xs italic text-warm-500 dark:border-charcoal-700 dark:text-cream-400">
          Cancelled — nothing was changed.
        </div>
      )}
    </div>
  )
}

interface ActionSectionProps {
  action: ProposedAction
  status: ActionApplyResult['status']
  errorMessage?: string
  disabled: boolean
  onChange: (fieldKey: string, value: ActionField['newValue']) => void
}

function ActionSection({
  action,
  status,
  errorMessage,
  disabled,
  onChange,
}: ActionSectionProps) {
  return (
    <div
      className={cn(
        'rounded-sm border bg-warm-50/40 p-2.5 dark:bg-charcoal-800/40',
        status === 'success'
          ? 'border-lime-300 dark:border-lime-800'
          : status === 'failure'
            ? 'border-red-300 dark:border-red-800'
            : status === 'skipped'
              ? 'border-warm-200 opacity-60 dark:border-charcoal-700'
              : 'border-warm-200 dark:border-charcoal-700'
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-sm border-warm-300 px-1.5 py-0 text-[10px] uppercase tracking-wider text-warm-600 dark:border-charcoal-700 dark:text-cream-400"
          >
            {action.kind} {ENTITY_LABELS[action.entity]}
          </Badge>
          <span className="text-xs font-medium text-warm-900 dark:text-cream-100">
            {action.targetLabel}
          </span>
        </div>
        <StatusIcon status={status} />
      </div>

      {action.fields.length === 0 ? (
        <p className="text-xs italic text-warm-500 dark:text-cream-400">
          (no fields to change)
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {action.fields.map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              disabled={disabled || status === 'success' || status === 'skipped'}
              onChange={(v) => onChange(field.key, v)}
            />
          ))}
        </div>
      )}

      {status === 'failure' && errorMessage && (
        <p className="mt-2 text-xs text-red-700 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: ActionApplyResult['status'] }) {
  if (status === 'in_progress') {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-warm-500" />
  }
  if (status === 'success') {
    return <Check className="h-3.5 w-3.5 text-lime-600" />
  }
  if (status === 'failure') {
    return <X className="h-3.5 w-3.5 text-red-600" />
  }
  if (status === 'skipped') {
    return (
      <span className="text-[10px] uppercase tracking-wider text-warm-400">
        skipped
      </span>
    )
  }
  return null
}

interface FieldRowProps {
  field: ActionField
  disabled?: boolean
  onChange: (value: ActionField['newValue']) => void
}

function FieldRow({ field, disabled, onChange }: FieldRowProps) {
  const isRef =
    typeof field.newValue === 'string' && field.newValue.startsWith(ACTION_REF_PREFIX)

  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-medium uppercase tracking-wider text-warm-500 dark:text-cream-400">
        {field.label}
      </Label>
      {isRef ? (
        <p className="rounded-sm border border-dashed border-warm-300 bg-warm-50/60 px-2 py-1 text-[11px] italic text-warm-500 dark:border-charcoal-700 dark:bg-charcoal-900/40 dark:text-cream-400">
          ↳ resolved from earlier action
        </p>
      ) : (
        <FieldInput field={field} disabled={disabled} onChange={onChange} />
      )}
      {field.helper && !isRef && (
        <p className="text-[10px] text-warm-400 dark:text-cream-500">{field.helper}</p>
      )}
    </div>
  )
}

function FieldInput({ field, disabled, onChange }: FieldRowProps) {
  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          rows={2}
          className="resize-none text-sm"
          value={asString(field.newValue)}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )
    case 'number':
    case 'currency':
      return (
        <Input
          type="number"
          step={field.type === 'currency' ? '0.01' : '1'}
          className="text-sm"
          value={field.newValue === null || field.newValue === undefined ? '' : String(field.newValue)}
          onChange={(e) => {
            const v = e.target.value
            if (v === '') onChange(null)
            else {
              const n = parseFloat(v)
              onChange(Number.isFinite(n) ? n : null)
            }
          }}
          disabled={disabled}
        />
      )
    case 'date':
      return (
        <Input
          type="date"
          className="text-sm"
          value={asString(field.newValue)}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )
    case 'select':
      return (
        <Select
          value={asString(field.newValue)}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
        >
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'boolean':
      return (
        <div className="flex items-center gap-2 rounded-sm border border-warm-200 bg-white px-2 py-1.5 dark:border-charcoal-700 dark:bg-charcoal-900">
          <Checkbox
            checked={!!field.newValue}
            onCheckedChange={(c) => onChange(c === true)}
            disabled={disabled}
          />
          <span className="text-xs text-warm-700 dark:text-cream-300">
            {field.newValue ? 'Yes' : 'No'}
          </span>
        </div>
      )
    case 'text':
    default:
      return (
        <Input
          className="text-sm"
          value={asString(field.newValue)}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )
  }
}

function asString(v: ActionField['newValue']): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}
