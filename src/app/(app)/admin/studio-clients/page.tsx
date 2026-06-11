'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  Plus,
  Search,
  DollarSign,
  Sparkles,
  UserPlus,
  ChevronRight,
  Loader2,
  Building2,
  Gift,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface StudioClient {
  id: string
  companyId: string
  companyName: string
  restaurantName?: string
  planTier: string
  status: string
  generationsUsed: number
  generationsLimit: number
  usagePercent: number
  isComplementary: boolean
  lastActivity?: string
  createdAt: string
}

interface Stats {
  totalClients: number
  activeClients: number
  trialClients: number
  totalGenerationsThisMonth: number
  recentSignups: number
  revenueThisMonth: number
}

type ChipTone = 'neutral' | 'gold' | 'teal' | 'coral' | 'green'

const PLAN_VARIANTS: Record<string, ChipTone> = {
  TRIAL: 'neutral',
  STARTER: 'neutral',
  PROFESSIONAL: 'gold',
  ENTERPRISE: 'gold',
}

const STATUS_VARIANTS: Record<string, ChipTone> = {
  active: 'green',
  paused: 'neutral',
  cancelled: 'coral',
  expired: 'neutral',
}

export default function StudioClientsPage() {
  const [clients, setClients] = useState<StudioClient[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPlan, setFilterPlan] = useState<string>('')

  // Add client modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingClient, setAddingClient] = useState(false)
  const [newClient, setNewClient] = useState({
    companyName: '',
    email: '',
    phone: '',
    planTier: 'TRIAL',
    isComplementary: false,
  })

  useEffect(() => {
    loadData()
  }, [filterStatus, filterPlan])

  async function loadData() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterPlan) params.set('planTier', filterPlan)
      if (search) params.set('search', search)

      const [clientsRes, statsRes] = await Promise.all([
        fetch(`/api/admin/studio-clients?${params}`),
        fetch('/api/admin/studio-clients/stats'),
      ])

      if (clientsRes.ok) {
        const data = await clientsRes.json()
        setClients(data.clients)
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    loadData()
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault()
    if (!newClient.companyName.trim()) {
      toast.error('Company name is required')
      return
    }

    setAddingClient(true)
    try {
      const response = await fetch('/api/admin/studio-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      })

      if (!response.ok) {
        throw new Error('Failed to create client')
      }

      toast.success('Client created successfully!')
      setShowAddModal(false)
      setNewClient({ companyName: '', email: '', phone: '', planTier: 'TRIAL', isComplementary: false })
      loadData()
    } catch (error) {
      toast.error('Failed to create client')
      console.error(error)
    } finally {
      setAddingClient(false)
    }
  }

  return (
    <div>
      <PageHeader
        kicker="STUDIO · BACKHAUS"
        title="Studio Clients"
        subtitle="Manage Creative Studio subscriptions"
        actions={
          <Button variant="gold" onClick={() => setShowAddModal(true)}>
            <Plus className="size-4" />
            Add Client
          </Button>
        }
      />

      {/* KPI row */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Clients"
            icon={Users}
            value={stats.totalClients}
            sub={`${stats.activeClients} active`}
          />
          <StatCard
            label="Generations"
            icon={Sparkles}
            value={stats.totalGenerationsThisMonth}
            sub="This month"
          />
          <StatCard
            label="New Signups"
            icon={UserPlus}
            value={stats.recentSignups}
            sub="Last 7 days"
          />
          <StatCard
            label="MRR"
            icon={DollarSign}
            value={formatMoney(stats.revenueThisMonth)}
            sub={`${stats.trialClients} on trial`}
          />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="min-w-[200px] max-w-md flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="pl-9"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Select
            value={filterStatus || 'all'}
            onValueChange={(value) => setFilterStatus(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterPlan || 'all'}
            onValueChange={(value) => setFilterPlan(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="TRIAL">Trial</SelectItem>
              <SelectItem value="STARTER">Starter</SelectItem>
              <SelectItem value="PROFESSIONAL">Professional</SelectItem>
              <SelectItem value="ENTERPRISE">Max</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : clients.length > 0 ? (
        <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-soft dark:shadow-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Client</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">View</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const overLimit = client.generationsUsed > client.generationsLimit
                return (
                  <TableRow key={client.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-secondary">
                          <Building2 className="size-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            {client.restaurantName || client.companyName}
                          </p>
                          {client.restaurantName && (
                            <p className="text-xs text-muted-foreground">{client.companyName}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={PLAN_VARIANTS[client.planTier] || 'neutral'}>
                          {client.planTier}
                        </Badge>
                        {client.isComplementary && (
                          <Badge variant="teal">
                            <Gift />
                            Comp
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-[100px] overflow-hidden rounded-full bg-secondary">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              overLimit
                                ? 'bg-coral-600 dark:bg-coral-300'
                                : 'bg-gold-600 dark:bg-gold-400'
                            )}
                            style={{ width: `${Math.min(client.usagePercent, 100)}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            'font-mono text-xs tabular-nums',
                            overLimit
                              ? 'text-coral-600 dark:text-coral-300'
                              : 'text-muted-foreground'
                          )}
                        >
                          {client.generationsUsed}/{client.generationsLimit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[client.status] || 'neutral'}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                      {client.lastActivity
                        ? new Date(client.lastActivity).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button asChild variant="ghost" size="icon-sm">
                        <Link
                          href={`/admin/studio-clients/${client.id}`}
                          aria-label="View client"
                        >
                          <ChevronRight className="size-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-[14px] border border-border bg-card shadow-soft dark:shadow-none">
          <EmptyState
            icon={Users}
            title="No studio clients yet"
            description="Add your first Creative Studio client — their plan, usage, and activity will all live here."
            action={
              <Button variant="outline" onClick={() => setShowAddModal(true)}>
                <Plus className="size-4" />
                Add Client
              </Button>
            }
            className="py-16"
          />
        </div>
      )}

      {/* Add Client Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddClient} className="space-y-4">
            <div>
              <Label htmlFor="companyName">Company / Restaurant Name *</Label>
              <Input
                id="companyName"
                value={newClient.companyName}
                onChange={(e) =>
                  setNewClient({ ...newClient, companyName: e.target.value })
                }
                placeholder="Salty Sow"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newClient.email}
                onChange={(e) =>
                  setNewClient({ ...newClient, email: e.target.value })
                }
                placeholder="owner@restaurant.com"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newClient.phone}
                onChange={(e) =>
                  setNewClient({ ...newClient, phone: e.target.value })
                }
                placeholder="(512) 555-0123"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="planTier">Plan</Label>
              <Select
                value={newClient.planTier}
                onValueChange={(value) =>
                  setNewClient({ ...newClient, planTier: value })
                }
                disabled={newClient.isComplementary}
              >
                <SelectTrigger id="planTier" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRIAL">Free (10 generations total)</SelectItem>
                  <SelectItem value="STARTER">Starter ($29/mo, 100 generations)</SelectItem>
                  <SelectItem value="PROFESSIONAL">Pro ($59/mo, 300 generations)</SelectItem>
                  <SelectItem value="ENTERPRISE">Max ($99/mo, 1,000 generations)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2.5">
              <input
                id="isComplementary"
                type="checkbox"
                checked={newClient.isComplementary}
                onChange={(e) => {
                  const checked = e.target.checked
                  setNewClient({
                    ...newClient,
                    isComplementary: checked,
                    planTier: checked ? 'PROFESSIONAL' : 'TRIAL',
                  })
                }}
                className="size-4 rounded border-input accent-primary"
              />
              <label
                htmlFor="isComplementary"
                className="flex items-center gap-1.5 text-sm text-foreground"
              >
                <Gift className="size-3.5 text-teal-600 dark:text-teal-300" />
                Grant complementary Pro access (free, no billing)
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="gold" disabled={addingClient}>
                {addingClient ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Add Client
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
