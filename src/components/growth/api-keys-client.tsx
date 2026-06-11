'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, Key, Copy, Check, MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ApiKeyData {
  id: string
  name: string
  description: string | null
  keyPrefix: string
  scopes: string[]
  isActive: boolean
  lastUsedAt: string | null
  usageCount: number
  createdAt: string
  expiresAt: string | null
  revokedAt: string | null
  user: {
    id: string
    firstName: string
    lastName: string
  }
}

interface ApiKeysClientProps {
  apiKeys: ApiKeyData[]
}

export function ApiKeysClient({ apiKeys: initialKeys }: ApiKeysClientProps) {
  const router = useRouter()
  const [apiKeys, setApiKeys] = useState(initialKeys)
  const [createOpen, setCreateOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyDescription, setNewKeyDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revokeId, setRevokeId] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/growth/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          description: newKeyDescription.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create API key')
      }

      const data = await response.json()
      setCreatedKey(data.rawKey)
      setNewKeyName('')
      setNewKeyDescription('')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async () => {
    if (!createdKey) return
    await navigator.clipboard.writeText(createdKey)
    setCopied(true)
    toast.success('API key copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRevoke = async () => {
    if (!revokeId) return

    try {
      const response = await fetch(`/api/growth/api-keys/${revokeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to revoke API key')
      }

      setApiKeys(prev => prev.map(k =>
        k.id === revokeId ? { ...k, isActive: false, revokedAt: new Date().toISOString() } : k
      ))
      toast.success('API key revoked')
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke API key')
    } finally {
      setRevokeId(null)
    }
  }

  const handleCloseCreated = () => {
    setCreatedKey(null)
    setCreateOpen(false)
    setCopied(false)
    router.refresh()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatRelative = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 30) return `${diffDays}d ago`
    return formatDate(dateStr)
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto bg-background min-h-screen">
      <PageHeader
        kicker="GROWTH · API ACCESS"
        title="API Keys"
        subtitle="Manage API keys for external agent access to the Growth API"
        actions={
          <Dialog open={createOpen} onOpenChange={(open) => {
            setCreateOpen(open)
            if (!open) {
              setCreatedKey(null)
              setCopied(false)
              setNewKeyName('')
              setNewKeyDescription('')
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="gold" size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              {!createdKey ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Create API Key</DialogTitle>
                    <DialogDescription>
                      Create a new API key for an external agent or integration.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <label className="kicker text-muted-foreground">Name</label>
                      <Input
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g., Aria - Lead Builder"
                        className="mt-1"
                        disabled={creating}
                      />
                    </div>
                    <div>
                      <label className="kicker text-muted-foreground">Description (optional)</label>
                      <Input
                        value={newKeyDescription}
                        onChange={(e) => setNewKeyDescription(e.target.value)}
                        placeholder="e.g., Used for automated lead discovery and outreach"
                        className="mt-1"
                        disabled={creating}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={creating} variant="gold">
                      {creating ? 'Creating...' : 'Create Key'}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>API Key Created</DialogTitle>
                    <DialogDescription>
                      Copy your API key now. You won&apos;t be able to see it again.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <div className="bg-ink-900 text-gold-400 p-3 rounded-[12px] font-mono text-xs break-all select-all dark:border dark:border-border">
                      {createdKey}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="mt-3 w-full"
                    >
                      {copied ? (
                        <>
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                          Copy to Clipboard
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-coral-600 dark:text-coral-300 mt-3 font-medium">
                      Store this key securely. It cannot be displayed again after you close this dialog.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCloseCreated} variant="gold">
                      Done
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      {/* Usage Info */}
      <div className="rounded-[14px] border bg-teal-600/10 border-teal-600/30 dark:bg-teal-300/12 dark:border-teal-300/25 p-4 mb-6">
        <p className="text-[13px] text-foreground">
          <strong>Usage:</strong> Include your API key in requests as{' '}
          <code className="bg-secondary px-1.5 py-0.5 rounded text-xs font-mono">
            Authorization: Bearer us_live_...
          </code>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          API keys grant full access to Growth endpoints (prospects, discovery, outreach, email-prospecting, pipeline) scoped to your company.
        </p>
      </div>

      {/* Keys Table */}
      <Card>
        <CardContent className="p-0">
          {apiKeys.length === 0 ? (
            <EmptyState
              icon={Key}
              title="No API keys yet"
              description="Create one to start using the Growth API programmatically"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3">Name</TableHead>
                  <TableHead className="px-3">Key</TableHead>
                  <TableHead className="px-3">Status</TableHead>
                  <TableHead className="px-3">Last Used</TableHead>
                  <TableHead className="px-3">Usage</TableHead>
                  <TableHead className="px-3">Created</TableHead>
                  <TableHead className="w-12 px-3" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="px-3">
                      <div className="text-sm font-medium text-foreground">{key.name}</div>
                      {key.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{key.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        by {key.user.firstName} {key.user.lastName}
                      </div>
                    </TableCell>
                    <TableCell className="px-3">
                      <code className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                        {key.keyPrefix}...
                      </code>
                    </TableCell>
                    <TableCell className="px-3">
                      {key.revokedAt ? (
                        <Badge variant="coral" className="text-[10px] px-1.5 py-0">
                          Revoked
                        </Badge>
                      ) : key.isActive ? (
                        <Badge variant="green" className="text-[10px] px-1.5 py-0">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="neutral" className="text-[10px] px-1.5 py-0">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-3 text-xs font-mono tabular-nums text-muted-foreground">
                      {formatRelative(key.lastUsedAt)}
                    </TableCell>
                    <TableCell className="px-3 text-xs font-mono tabular-nums text-muted-foreground">
                      {key.usageCount.toLocaleString()} calls
                    </TableCell>
                    <TableCell className="px-3 text-xs font-mono tabular-nums text-muted-foreground">
                      {formatDate(key.createdAt)}
                    </TableCell>
                    <TableCell className="px-3">
                      {key.isActive && !key.revokedAt && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setRevokeId(key.id)}>
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Revoke Key
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Revoke Confirmation */}
      <AlertDialog open={!!revokeId} onOpenChange={(open) => !open && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately disable the API key. Any agents or integrations using it will stop working. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
