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
import { Plus, Key, Copy, Check, MoreHorizontal, Trash2, Eye, EyeOff } from 'lucide-react'
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
    <div className="p-4 md:p-6 max-w-4xl mx-auto bg-warm-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-medium tracking-tight text-warm-900">API Keys</h1>
          <p className="text-sm text-warm-500 mt-0.5">Manage API keys for external agent access to the Growth API</p>
        </div>
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
            <Button variant="lime" size="sm" className="rounded-sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-sm">
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
                    <label className="text-sm font-medium text-warm-700">Name</label>
                    <Input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Aria - Lead Builder"
                      className="mt-1 rounded-sm"
                      disabled={creating}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-warm-700">Description (optional)</label>
                    <Input
                      value={newKeyDescription}
                      onChange={(e) => setNewKeyDescription(e.target.value)}
                      placeholder="e.g., Used for automated lead discovery and outreach"
                      className="mt-1 rounded-sm"
                      disabled={creating}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating} className="rounded-sm">
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={creating} variant="lime" className="rounded-sm">
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
                  <div className="bg-warm-900 text-lime-400 p-3 rounded-sm font-mono text-xs break-all select-all">
                    {createdKey}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="mt-3 rounded-sm w-full"
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
                  <p className="text-xs text-red-600 mt-3 font-medium">
                    Store this key securely. It cannot be displayed again after you close this dialog.
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={handleCloseCreated} variant="lime" className="rounded-sm">
                    Done
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Usage Info */}
      <Card className="rounded-sm border-warm-200 border-l-4 border-l-ocean-500 mb-6">
        <CardContent className="p-4">
          <p className="text-sm text-warm-700">
            <strong>Usage:</strong> Include your API key in requests as{' '}
            <code className="bg-warm-100 px-1.5 py-0.5 rounded text-xs font-mono">
              Authorization: Bearer us_live_...
            </code>
          </p>
          <p className="text-xs text-warm-500 mt-1">
            API keys grant full access to Growth endpoints (prospects, discovery, outreach, email-prospecting, pipeline) scoped to your company.
          </p>
        </CardContent>
      </Card>

      {/* Keys Table */}
      <Card className="rounded-sm border-warm-200">
        <CardContent className="p-0">
          {apiKeys.length === 0 ? (
            <div className="p-12 text-center">
              <Key className="h-10 w-10 text-warm-300 mx-auto mb-3" />
              <p className="text-sm text-warm-500">No API keys yet</p>
              <p className="text-xs text-warm-400 mt-1">Create one to start using the Growth API programmatically</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-warm-100 border-b border-warm-200">
                  <tr>
                    <th className="p-3 text-left text-xs font-medium text-warm-700">Name</th>
                    <th className="p-3 text-left text-xs font-medium text-warm-700">Key</th>
                    <th className="p-3 text-left text-xs font-medium text-warm-700">Status</th>
                    <th className="p-3 text-left text-xs font-medium text-warm-700">Last Used</th>
                    <th className="p-3 text-left text-xs font-medium text-warm-700">Usage</th>
                    <th className="p-3 text-left text-xs font-medium text-warm-700">Created</th>
                    <th className="w-12 p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100">
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-warm-50 transition-colors">
                      <td className="p-3">
                        <div className="text-sm font-medium text-warm-900">{key.name}</div>
                        {key.description && (
                          <div className="text-xs text-warm-500 mt-0.5">{key.description}</div>
                        )}
                        <div className="text-xs text-warm-400 mt-0.5">
                          by {key.user.firstName} {key.user.lastName}
                        </div>
                      </td>
                      <td className="p-3">
                        <code className="text-xs font-mono text-warm-600 bg-warm-100 px-1.5 py-0.5 rounded">
                          {key.keyPrefix}...
                        </code>
                      </td>
                      <td className="p-3">
                        {key.revokedAt ? (
                          <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200">
                            Revoked
                          </Badge>
                        ) : key.isActive ? (
                          <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-lime-100 text-lime-700 border-lime-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-warm-100 text-warm-600 border-warm-200">
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-xs text-warm-600">
                        {formatRelative(key.lastUsedAt)}
                      </td>
                      <td className="p-3 text-xs text-warm-600">
                        {key.usageCount.toLocaleString()} calls
                      </td>
                      <td className="p-3 text-xs text-warm-600">
                        {formatDate(key.createdAt)}
                      </td>
                      <td className="p-3">
                        {key.isActive && !key.revokedAt && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-warm-500 hover:text-warm-900">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-sm">
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setRevokeId(key.id)}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Revoke Key
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke Confirmation */}
      <AlertDialog open={!!revokeId} onOpenChange={(open) => !open && setRevokeId(null)}>
        <AlertDialogContent className="rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately disable the API key. Any agents or integrations using it will stop working. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="rounded-sm bg-red-600 hover:bg-red-700">
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
