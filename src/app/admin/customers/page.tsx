'use client'
import { useEffect, useState, useMemo } from 'react'
import { Search, ChevronDown, AlertTriangle, Ban, Flag, User } from 'lucide-react'

interface OrderItem { name: string; quantity: number; size: string; price: number }
interface Order {
  _id: string
  orderNumber: string
  customer: { name: string; phone: string; city: string; address: string; email?: string }
  items: OrderItem[]
  total: number
  status: string
  flagged: boolean
  flagSeverity?: 'low' | 'medium' | 'high'
  createdAt: string
}

interface Customer {
  phone: string
  name: string
  city: string
  address: string
  email?: string
  orders: Order[]
  totalSpent: number
  orderCount: number
  lastOrder: string
  flagged: boolean
  blacklisted: boolean
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', shipped: 'Shipped',
  delivered: 'Delivered', cancelled: 'Cancelled',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-400/10',
  confirmed: 'text-blue-400 bg-blue-400/10',
  shipped: 'text-purple-400 bg-purple-400/10',
  delivered: 'text-green-400 bg-green-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default function CustomersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [blocklist, setBlocklist] = useState<Array<{ phone?: string; name?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'lastOrder' | 'totalSpent' | 'orderCount'>('lastOrder')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/orders', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/blocklist', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([ord, bl]) => {
      if (Array.isArray(ord)) setOrders(ord)
      if (Array.isArray(bl)) setBlocklist(bl)
    }).finally(() => setLoading(false))
  }, [])

  const customers = useMemo<Customer[]>(() => {
    const map = new Map<string, Customer>()

    orders.forEach((order) => {
      const rawPhone = order.customer.phone || ''
      const key = rawPhone.replace(/\D/g, '').slice(-9) || `noPhone_${order._id}`
      if (!map.has(key)) {
        map.set(key, {
          phone: order.customer.phone,
          name: order.customer.name,
          city: order.customer.city,
          address: order.customer.address,
          email: order.customer.email,
          orders: [],
          totalSpent: 0,
          orderCount: 0,
          lastOrder: order.createdAt,
          flagged: false,
          blacklisted: false,
        })
      }
      const c = map.get(key)!
      c.orders.push(order)
      c.orderCount++
      if (['confirmed', 'shipped', 'delivered'].includes(order.status)) c.totalSpent += order.total
      if (order.flagged) c.flagged = true
      if (new Date(order.createdAt) > new Date(c.lastOrder)) {
        c.lastOrder = order.createdAt
        c.name = order.customer.name
        c.city = order.customer.city
        c.email = order.customer.email || c.email
      }
    })

    const result: Customer[] = []
    map.forEach((c) => {
      const phoneKey = c.phone.replace(/\D/g, '')
      c.blacklisted = blocklist.some(
        (b) => (b.phone && phoneKey.endsWith(b.phone.slice(-9))) ||
                (b.name && b.name.toLowerCase() === c.name.toLowerCase())
      )
      result.push(c)
    })
    return result
  }, [orders, blocklist])

  const filtered = useMemo(() => {
    let data = customers
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (c) => c.name.toLowerCase().includes(q) ||
          c.phone.includes(search) ||
          c.city.toLowerCase().includes(q)
      )
    }
    return [...data].sort((a, b) => {
      if (sort === 'lastOrder') return new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime()
      if (sort === 'totalSpent') return b.totalSpent - a.totalSpent
      return b.orderCount - a.orderCount
    })
  }, [customers, search, sort])

  const totalCustomers = customers.length
  const repeatCustomers = customers.filter((c) => c.orderCount > 1).length
  const blacklistedCount = customers.filter((c) => c.blacklisted).length

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-white text-2xl font-semibold">Customers</h1>
        <p className="text-white/40 text-sm mt-0.5">Order history and behavior per customer</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Customers', value: loading ? '—' : fmt(totalCustomers), color: 'text-brand-gold' },
          { label: 'Repeat Customers', value: loading ? '—' : fmt(repeatCustomers), color: 'text-green-400' },
          { label: 'Blacklisted', value: loading ? '—' : fmt(blacklistedCount), color: 'text-red-400' },
          { label: 'Flagged', value: loading ? '—' : fmt(customers.filter((c) => c.flagged).length), color: 'text-orange-400' },
        ].map((card) => (
          <div key={card.label} className="bg-white/5 border border-white/5 p-4">
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">{card.label}</p>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Name, phone, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-gold"
          />
        </div>
        <div className="flex gap-2">
          {(['lastOrder', 'totalSpent', 'orderCount'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-2 text-xs tracking-widest uppercase transition-colors ${
                sort === s ? 'bg-brand-gold text-brand-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {s === 'lastOrder' ? 'Recent' : s === 'totalSpent' ? 'Spent' : 'Orders'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-16 rounded" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-white/30 text-center py-12">No customers found</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((customer) => {
            const key = customer.phone.replace(/\D/g, '').slice(-9)
            const isOpen = expanded === key
            const deliveredCount = customer.orders.filter((o) => o.status === 'delivered').length
            const cancelledCount = customer.orders.filter((o) => o.status === 'cancelled').length

            return (
              <div
                key={key}
                className={`border transition-colors ${
                  customer.blacklisted ? 'bg-red-500/5 border-red-500/20' :
                  customer.flagged ? 'bg-orange-500/5 border-orange-500/20' :
                  'bg-white/5 border-white/5'
                }`}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : key)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      customer.blacklisted ? 'bg-red-500/20' : customer.flagged ? 'bg-orange-500/20' : 'bg-white/10'
                    }`}>
                      {customer.blacklisted
                        ? <Ban size={14} className="text-red-400" />
                        : customer.flagged
                        ? <Flag size={14} className="text-orange-400" />
                        : <User size={14} className="text-white/40" />
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium text-sm">{customer.name}</p>
                        {customer.blacklisted && (
                          <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 uppercase tracking-widest">Blacklisted</span>
                        )}
                        {customer.flagged && !customer.blacklisted && (
                          <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 uppercase tracking-widest">Flagged</span>
                        )}
                        {customer.orderCount > 1 && (
                          <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 uppercase tracking-widest">Repeat</span>
                        )}
                      </div>
                      <p className="text-white/40 text-xs mt-0.5 truncate">
                        {customer.phone} — {customer.city}
                      </p>
                      <p className="text-white/25 text-[10px] mt-0.5">
                        Last order: {new Date(customer.lastOrder).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(customer.lastOrder).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 flex-shrink-0 ml-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-brand-gold text-sm font-semibold">{fmt(customer.totalSpent)} MAD</p>
                      <p className="text-white/30 text-[10px]">{customer.orderCount} order{customer.orderCount > 1 ? 's' : ''}</p>
                    </div>
                    <ChevronDown size={14} className={`text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-white/5 px-5 pb-5 pt-4">
                    {/* Customer info */}
                    <div className="grid sm:grid-cols-3 gap-4 mb-5 pb-4 border-b border-white/5">
                      <div>
                        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Contact</p>
                        <p className="text-white text-sm">{customer.phone}</p>
                        {customer.email && <p className="text-white/50 text-xs">{customer.email}</p>}
                      </div>
                      <div>
                        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Address</p>
                        <p className="text-white text-sm">{customer.city}</p>
                        {customer.address && <p className="text-white/40 text-xs">{customer.address}</p>}
                      </div>
                      <div>
                        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Stats</p>
                        <p className="text-white text-sm">{fmt(customer.totalSpent)} MAD spent</p>
                        <p className="text-white/40 text-xs">{deliveredCount} delivered · {cancelledCount} cancelled</p>
                      </div>
                    </div>

                    {/* Order history */}
                    <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">Order History</p>
                    <div className="space-y-2">
                      {customer.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((order) => (
                        <div key={order._id} className={`border p-3 ${order.flagged ? 'border-orange-500/20 bg-orange-500/5' : 'border-white/5 bg-white/3'}`}>
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-white text-sm font-medium">{order.orderNumber}</p>
                                {order.flagged && <AlertTriangle size={10} className="text-orange-400" />}
                              </div>
                              <p className="text-white/40 text-[10px] mt-0.5">
                                {new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {' · '}
                                {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-brand-gold text-sm font-semibold">{fmt(order.total)} MAD</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_COLORS[order.status] || 'text-white/40'}`}>
                                {STATUS_LABELS[order.status] || order.status}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
                            {order.items.map((item, i) => (
                              <span key={i} className="text-white/40 text-[10px]">
                                {item.name} {item.size} ×{item.quantity}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
