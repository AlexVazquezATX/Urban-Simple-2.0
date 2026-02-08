'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  Plus,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Sparkles,
  UserPlus,
  ChevronRight,
  Loader2,
  Building2,
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

const PLAN_COLORS: Record<string, string> = {
  TRIAL: 'bg-gray-100 text-gray-700 border-gray-200',
  STARTER: 'bg-blue-100 text-blue-700 border-blue-200',
  PROFESSIONAL: 'bg-purple-100 text-purple-700 border-purple-200',
  ENTERPRISE: 'bg-amber-100 text-amber-700 border-amber-200',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
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
      setNewClient({ companyName: '', email: '', phone: '', planTier: 'TRIAL' })
      loadData()
    } catch (error) {
      toast.error('Failed to create client')
      console.error(error)
    } finally {
      setAddingClient(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header */}
      <div className="border-b border-warm-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-lime-100 rounded-sm">
                <Users className="w-5 h-5 text-lime-700" />
              </div>
              <div>
                <h1 className="text-lg font-display font-medium text-warm-900">
                  Studio Clients
                </h1>
                <p className="text-sm text-warm-500">
                  Manage Creative Studio subscriptions
                </p>
              </div>
            </div>
            <Button
              variant="lime"
              size="sm"
              className="rounded-sm"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Client
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-sm border border-warm-200 p-4">
              <div className="flex items-center gap-2 text-warm-500 text-xs mb-1">
                <Users className="w-3.5 h-3.5" />
                Total Clients
              </div>
              <p className="text-2xl font-display font-medium text-warm-900">
                {stats.totalClients}
              </p>
              <p className="text-xs text-warm-500 mt-1">
                {stats.activeClients} active
              </p>
            </div>

            <div className="bg-white rounded-sm border border-warm-200 p-4">
              <div className="flex items-center gap-2 text-warm-500 text-xs mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Generations
              </div>
              <p className="text-2xl font-display font-medium text-warm-900">
                {stats.totalGenerationsThisMonth}
              </p>
              <p className="text-xs text-warm-500 mt-1">This month</p>
            </div>

            <div className="bg-white rounded-sm border border-warm-200 p-4">
              <div className="flex items-center gap-2 text-warm-500 text-xs mb-1">
                <UserPlus className="w-3.5 h-3.5" />
                New Signups
              </div>
              <p className="text-2xl font-display font-medium text-warm-900">
                {stats.recentSignups}
              </p>
              <p className="text-xs text-warm-500 mt-1">Last 7 days</p>
            </div>

            <div className="bg-white rounded-sm border border-warm-200 p-4">
              <div className="flex items-center gap-2 text-warm-500 text-xs mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                MRR
              </div>
              <p className="text-2xl font-display font-medium text-warm-900">
                ${stats.revenueThisMonth.toLocaleString()}
              </p>
              <p className="text-xs text-warm-500 mt-1">
                {stats.trialClients} on trial
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="pl-9 rounded-sm"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-warm-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm rounded-sm border border-warm-300 bg-white"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>

            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="px-3 py-2 text-sm rounded-sm border border-warm-300 bg-white"
            >
              <option value="">All Plans</option>
              <option value="TRIAL">Trial</option>
              <option value="STARTER">Starter</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Client List */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-warm-400" />
          </div>
        ) : clients.length > 0 ? (
          <div className="bg-white rounded-sm border border-warm-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-warm-50 border-b border-warm-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-warm-600 uppercase tracking-wide">
                    Client
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-warm-600 uppercase tracking-wide">
                    Plan
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-warm-600 uppercase tracking-wide">
                    Usage
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-warm-600 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-warm-600 uppercase tracking-wide">
                    Last Active
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-warm-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-sm bg-warm-100 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-warm-500" />
                        </div>
                        <div>
                          <p className="font-medium text-warm-900">
                            {client.restaurantName || client.companyName}
                          </p>
                          {client.restaurantName && (
                            <p className="text-xs text-warm-500">{client.companyName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          'text-xs rounded-sm',
                          PLAN_COLORS[client.planTier] || PLAN_COLORS.TRIAL
                        )}
                      >
                        {client.planTier}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[100px] h-2 bg-warm-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              client.usagePercent >= 90
                                ? 'bg-red-500'
                                : client.usagePercent >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-lime-500'
                            )}
                            style={{ width: `${Math.min(client.usagePercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-warm-600">
                          {client.generationsUsed}/{client.generationsLimit}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          'text-xs rounded-sm',
                          STATUS_COLORS[client.status] || STATUS_COLORS.active
                        )}
                      >
                        {client.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-warm-600">
                      {client.lastActivity
                        ? new Date(client.lastActivity).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/studio-clients/${client.id}`}>
                        <Button variant="ghost" size="sm" className="rounded-sm">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-sm border border-warm-200">
            <div className="w-16 h-16 rounded-sm bg-warm-100 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-warm-400" />
            </div>
            <h3 className="text-sm font-medium text-warm-900 mb-1">No clients yet</h3>
            <p className="text-sm text-warm-500 mb-4">
              Add your first Creative Studio client
            </p>
            <Button
              variant="lime"
              size="sm"
              className="rounded-sm"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Client
            </Button>
          </div>
        )}
      </div>

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
                className="rounded-sm mt-1.5"
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
                className="rounded-sm mt-1.5"
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
                className="rounded-sm mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="planTier">Plan</Label>
              <select
                id="planTier"
                value={newClient.planTier}
                onChange={(e) =>
                  setNewClient({ ...newClient, planTier: e.target.value })
                }
                className="w-full px-3 py-2 rounded-sm border border-warm-300 bg-white text-sm mt-1.5"
              >
                <option value="TRIAL">Trial (10 generations, 14 days)</option>
                <option value="STARTER">Starter ($29/mo, 50 generations)</option>
                <option value="PROFESSIONAL">Professional ($79/mo, 200 generations)</option>
                <option value="ENTERPRISE">Enterprise (Custom)</option>
              </select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="rounded-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="lime"
                disabled={addingClient}
                className="rounded-sm"
              >
                {addingClient ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1.5" />
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
