'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronDown, Search, Clock, Package, Truck, RefreshCw, ExternalLink } from 'lucide-react'

function cad(amount: number) {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
}

const STATUSES = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', shipped: 'Shipped',
  delivered: 'Delivered', cancelled: 'Cancelled',
}
const statusColors: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-400/10',
  confirmed: 'text-blue-400 bg-blue-400/10',
  shipped: 'text-purple-400 bg-purple-400/10',
  delivered: 'text-green-400 bg-green-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
}

interface Order {
  _id: string
  orderNumber: string
  customer: { name: string; phone: string; city: string; address: string; state?: string; country: string; postalCode?: string; email?: string }
  items: Array<{ name: string; quantity: number; size: string; price: number }>
  total: number
  status: string
  createdAt: string
  cjOrderId?: string
  cjTrackingNumber?: string
}

interface CJTracking {
  cjOrderId: string
  trackingNumber: string | null
  cjStatus: string | null
  trackingUrl: string | null
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filtered, setFiltered] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [fulfilling, setFulfilling] = useState<string | null>(null)
  const [tracking, setTracking] = useState<Record<string, CJTracking>>({})

  useEffect(() => {
    fetch('/api/orders', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return
        setOrders(data)
        setFiltered(data)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let data = orders
    if (filter !== 'all') data = data.filter((o) => o.status === filter)
    if (search) data = data.filter(
      (o) => o.orderNumber.includes(search) ||
        o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
        o.customer.phone.includes(search)
    )
    setFiltered(data)
  }, [filter, search, orders])

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, status } : o)))
      toast.success('Status updated')
    } else {
      toast.error('Error')
    }
  }

  const fulfillWithCJ = async (order: Order) => {
    setFulfilling(order._id)
    try {
      const res = await fetch('/api/cj/fulfill', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order._id }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`CJ order created: ${data.cjOrderId}`)
        setOrders((prev) => prev.map((o) => o._id === order._id ? { ...o, cjOrderId: data.cjOrderId } : o))
      } else {
        toast.error(data.error || 'CJ fulfillment failed', { duration: 8000 })
      }
    } catch {
      toast.error('Network error')
    } finally {
      setFulfilling(null)
    }
  }

  const syncTracking = async (orderId: string) => {
    try {
      const res = await fetch(`/api/cj/tracking?orderId=${orderId}`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setTracking((prev) => ({ ...prev, [orderId]: data }))
        if (data.trackingNumber) toast.success(`Tracking: ${data.trackingNumber}`)
        else toast('No tracking number yet — check back later')
      } else {
        toast.error(data.error || 'Could not fetch tracking')
      }
    } catch {
      toast.error('Network error')
    }
  }

  const untouchedCount = orders.filter((o) => o.status === 'pending').length

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      {untouchedCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 mb-6">
          <Clock size={13} className="text-amber-400 shrink-0" />
          <span className="text-amber-400 text-sm font-semibold">{untouchedCount} pending order{untouchedCount > 1 ? 's' : ''} to process</span>
        </div>
      )}

      <h1 className="text-white text-2xl font-semibold mb-6">Orders</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Name, phone, order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-gold"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex-shrink-0 px-4 py-2 text-xs tracking-widest uppercase transition-colors ${
                filter === s ? 'bg-brand-gold text-brand-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-16 rounded" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-white/30 text-center py-12">No orders</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div key={order._id} className="bg-white/5 border border-white/5 transition-colors">
              <button
                onClick={() => setExpanded(expanded === order._id ? null : order._id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm">{order.orderNumber}</p>
                  <p className="text-white/40 text-xs mt-0.5 truncate">
                    {order.customer.name} — {order.customer.city} — {order.customer.phone}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <span className="text-white text-sm hidden sm:block">{cad(order.total)}</span>
                  <span className={`text-[10px] px-2 py-1 rounded-full uppercase tracking-wider ${statusColors[order.status] || 'text-white/40'}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                  <ChevronDown size={14} className={`text-white/40 transition-transform ${expanded === order._id ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {expanded === order._id && (
                <div className="px-5 pb-5 border-t border-white/5 pt-4">
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Customer</p>
                      <p className="text-white text-sm">{order.customer.name}</p>
                      <p className="text-white/50 text-sm">{order.customer.phone}</p>
                      <p className="text-white/50 text-sm">{order.customer.city}</p>
                      {order.customer.address && <p className="text-white/40 text-xs mt-1">{order.customer.address}</p>}
                      {order.customer.email && <p className="text-white/40 text-xs">{order.customer.email}</p>}
                    </div>
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Items</p>
                      {order.items.map((item, i) => (
                        <p key={i} className="text-white/70 text-sm">
                          {item.name} — {item.size} × {item.quantity}
                        </p>
                      ))}
                      <p className="text-brand-gold font-semibold mt-2">Total: {cad(order.total)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Change Status</p>
                    <div className="flex flex-wrap gap-2">
                      {(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => updateStatus(order._id, s)}
                          className={`px-3 py-1.5 text-xs tracking-widest uppercase transition-colors ${
                            order.status === s
                              ? 'bg-brand-gold text-brand-black'
                              : 'bg-white/10 text-white/60 hover:bg-white/20'
                          }`}
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CJ Fulfillment */}
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-3">CJ Dropshipping</p>
                    {order.cjOrderId ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <Package size={12} className="text-green-400" />
                          <span className="text-green-400 font-semibold">Fulfilled</span>
                          <span className="text-white/40">· CJ Order: {order.cjOrderId}</span>
                        </div>
                        {tracking[order._id] ? (
                          <div className="flex items-center gap-2 text-xs">
                            <Truck size={12} className="text-blue-400" />
                            {tracking[order._id].trackingNumber ? (
                              <>
                                <span className="text-white/70">{tracking[order._id].trackingNumber}</span>
                                {tracking[order._id].cjStatus && <span className="text-white/40">· {tracking[order._id].cjStatus}</span>}
                                {tracking[order._id].trackingUrl && (
                                  <a href={tracking[order._id].trackingUrl!} target="_blank" rel="noopener noreferrer"
                                    className="text-brand-gold hover:underline flex items-center gap-0.5">
                                    Track <ExternalLink size={10} />
                                  </a>
                                )}
                              </>
                            ) : (
                              <span className="text-white/40">No tracking yet · Status: {tracking[order._id].cjStatus ?? '—'}</span>
                            )}
                          </div>
                        ) : null}
                        <button onClick={() => syncTracking(order._id)}
                          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-xs px-3 py-1.5 transition-colors">
                          <RefreshCw size={11} /> Sync Tracking
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fulfillWithCJ(order)}
                        disabled={fulfilling === order._id || order.status === 'cancelled'}
                        className="flex items-center gap-2 bg-brand-gold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-brand-black text-xs font-bold px-4 py-2 transition-colors"
                      >
                        {fulfilling === order._id ? (
                          <><RefreshCw size={12} className="animate-spin" /> Placing CJ Order...</>
                        ) : (
                          <><Package size={12} /> Fulfill with CJ</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
