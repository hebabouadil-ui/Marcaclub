'use client'
import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ShoppingBag, Package, TrendingUp, Clock,
  Radio, Star, BarChart2, Users, CheckCircle, Eye,
} from 'lucide-react'
import Link from 'next/link'

interface Order {
  _id: string
  orderNumber: string
  customer: { name: string; phone: string; city: string }
  items: Array<{ name: string; quantity: number; price: number }>
  total: number
  status: string
  createdAt: string
}

interface Product {
  _id: string
  name: string
  price: number
  stock: number
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
const STATUS_BAR: Record<string, string> = {
  pending: 'bg-amber-400', confirmed: 'bg-blue-400',
  shipped: 'bg-purple-400', delivered: 'bg-green-400', cancelled: 'bg-red-400',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

// Orders are stored in MAD — convert to CAD for display (1 MAD ≈ 0.148 CAD)
const MAD_TO_CAD = 0.148
function cad(mad: number) {
  return (mad * MAD_TO_CAD).toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [liveStatus, setLiveStatus] = useState(false)
  const [loading, setLoading] = useState(true)
  const [visitors, setVisitors] = useState<number | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    const fetchData = () => {
      Promise.all([
        fetch('/api/orders', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/products?all=true', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/live', { credentials: 'include' }).then((r) => r.json()),
      ]).then(([ord, prod, live]) => {
        if (Array.isArray(ord)) setOrders(ord)
        if (Array.isArray(prod)) setProducts(prod)
        setLiveStatus(live?.liveStatus ?? false)
        setLastUpdated(new Date())
      }).finally(() => setLoading(false))
    }

    const fetchVisitors = () => {
      fetch('/api/visitors', { credentials: 'include' })
        .then((r) => r.json())
        .then((d) => setVisitors(d.count ?? 0))
        .catch(() => {})
    }

    fetchData()
    fetchVisitors()
    const dataInterval = setInterval(() => { if (!document.hidden) fetchData() }, 30_000)
    const visitorInterval = setInterval(() => { if (!document.hidden) fetchVisitors() }, 30_000)
    return () => { clearInterval(dataInterval); clearInterval(visitorInterval) }
  }, [])

  const toggleLive = async () => {
    const next = !liveStatus
    setLiveStatus(next)
    await fetch('/api/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ liveStatus: next }),
    })
  }

  const stats = useMemo(() => {
    const active = orders.filter((o) => ['confirmed', 'shipped', 'delivered'].includes(o.status))
    const revenue = active.reduce((s, o) => s + o.total, 0)
    const delivered = orders.filter((o) => o.status === 'delivered')
    const cancelled = orders.filter((o) => o.status === 'cancelled')
    const pending = orders.filter((o) => o.status === 'pending')
    const avgOrder = active.length > 0 ? revenue / active.length : 0
    const nonCancelled = orders.filter((o) => o.status !== 'cancelled')
    const deliveryRate = nonCancelled.length > 0 ? (delivered.length / nonCancelled.length) * 100 : 0

    const days: { label: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        value: orders.filter((o) => {
          const t = new Date(o.createdAt).getTime()
          return t >= d.getTime() && t < next.getTime() &&
            ['confirmed', 'shipped', 'delivered'].includes(o.status)
        }).reduce((s, o) => s + o.total, 0),
      })
    }

    const ordersByDay = days.map((_, idx) => {
      const dd = new Date(); dd.setDate(dd.getDate() - (6 - idx)); dd.setHours(0, 0, 0, 0)
      const nxt = new Date(dd); nxt.setDate(nxt.getDate() + 1)
      return orders.filter((o) => {
        const t = new Date(o.createdAt).getTime()
        return t >= dd.getTime() && t < nxt.getTime()
      }).length
    })

    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {}
    for (const o of active) {
      for (const item of o.items) {
        if (!productSales[item.name]) productSales[item.name] = { name: item.name, qty: 0, revenue: 0 }
        productSales[item.name].qty += item.quantity
        productSales[item.name].revenue += item.price * item.quantity
      }
    }
    const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5)

    const statusBreakdown = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((s) => ({
      status: s, count: orders.filter((o) => o.status === s).length,
    }))

    const cities: Record<string, number> = {}
    for (const o of orders) {
      const c = o.customer.city?.trim() || 'Unknown'
      cities[c] = (cities[c] || 0) + 1
    }
    const topCities = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const phones = new Set(orders.map((o) => (o.customer.phone || '').replace(/\D/g, '').slice(-9)).filter(Boolean))

    return {
      revenue, avgOrder, deliveryRate,
      total: orders.length, pending: pending.length, cancelled: cancelled.length,
      delivered: delivered.length, uniqueCustomers: phones.size,
      recentOrders: orders.slice(0, 8),
      revenueByDay: days, ordersByDay, topProducts, statusBreakdown, topCities,
    }
  }, [orders])

  const maxRevDay = Math.max(...(stats?.revenueByDay.map((d) => d.value) ?? [1]), 1)
  const maxOrdDay = Math.max(...(stats?.ordersByDay ?? [1]), 1)

  const kpis = [
    { label: 'Total Revenue', value: loading ? '—' : cad(stats.revenue), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10', sub: `${loading ? '—' : stats.delivered} delivered orders` },
    { label: 'Total Orders', value: loading ? '—' : fmt(stats.total), icon: ShoppingBag, color: 'text-brand-gold', bg: 'bg-brand-gold/10', sub: `${loading ? '—' : stats.pending} pending` },
    { label: 'Customers', value: loading ? '—' : fmt(stats.uniqueCustomers), icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10', sub: 'unique buyers' },
    { label: 'Delivery Rate', value: loading ? '—' : `${stats.deliveryRate.toFixed(0)}%`, icon: CheckCircle, color: 'text-purple-400', bg: 'bg-purple-400/10', sub: 'of non-cancelled orders' },
    { label: 'Avg. Order', value: loading ? '—' : cad(stats.avgOrder), icon: BarChart2, color: 'text-cyan-400', bg: 'bg-cyan-400/10', sub: 'confirmed orders' },
    { label: 'Products', value: loading ? '—' : fmt(products.length), icon: Package, color: 'text-amber-400', bg: 'bg-amber-400/10', sub: `${loading ? '—' : products.filter((p) => p.stock === 0).length} out of stock` },
    { label: 'Visitors Now', value: visitors === null ? '—' : fmt(visitors), icon: Eye, color: 'text-green-300', bg: 'bg-green-300/10', sub: 'active in last 2 min', live: true },
    { label: 'Cancelled', value: loading ? '—' : fmt(stats.cancelled), icon: Clock, color: 'text-red-400', bg: 'bg-red-400/10', sub: `${loading ? '—' : stats.total > 0 ? ((stats.cancelled / stats.total) * 100).toFixed(0) : 0}% of total` },
  ]

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-white/40 text-sm mt-0.5">
            {lastUpdated
              ? <>Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse align-middle ml-1" /></>
              : 'Store overview'
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stats.pending > 0 && (
            <Link href="/admin/orders" className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-4 py-2 hover:bg-amber-500/20 transition-colors">
              <Clock size={12} />
              {stats.pending} pending order{stats.pending > 1 ? 's' : ''}
            </Link>
          )}
          <button
            onClick={toggleLive}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold tracking-wider transition-all ${liveStatus ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          >
            <Radio size={14} />
            {liveStatus ? 'LIVE ON' : 'LIVE OFF'}
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-white/5 border border-white/5 p-5 hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/40 text-[10px] tracking-widest uppercase">{card.label}</p>
                <div className={`p-1.5 rounded-md ${card.bg}`}>
                  <Icon size={13} className={card.color} />
                  {'live' in card && card.live && (
                    <span className="relative flex h-1.5 w-1.5 ml-0.5 -mt-0.5 inline-block">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                    </span>
                  )}
                </div>
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-white/25 text-[10px] mt-1">{card.sub}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/5 p-5">
          <h3 className="text-white/60 text-[10px] uppercase tracking-widest mb-5">Revenue — Last 7 Days</h3>
          <div className="flex items-end gap-1.5 h-36">
            {stats.revenueByDay.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black border border-white/10 px-2 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                  {cad(d.value)}
                </div>
                <div className="w-full bg-brand-gold/70 hover:bg-brand-gold rounded-sm transition-colors"
                  style={{ height: `${maxRevDay > 0 ? (d.value / maxRevDay) * 100 : 0}%`, minHeight: d.value > 0 ? '4px' : '0' }} />
                <span className="text-white/30 text-[9px]">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/5 p-5">
          <h3 className="text-white/60 text-[10px] uppercase tracking-widest mb-5">Orders — Last 7 Days</h3>
          <div className="flex items-end gap-1.5 h-36">
            {stats.revenueByDay.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black border border-white/10 px-2 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                  {stats.ordersByDay[i]} order{stats.ordersByDay[i] !== 1 ? 's' : ''}
                </div>
                <div className="w-full bg-blue-400/60 hover:bg-blue-400 rounded-sm transition-colors"
                  style={{ height: `${maxOrdDay > 0 ? (stats.ordersByDay[i] / maxOrdDay) * 100 : 0}%`, minHeight: stats.ordersByDay[i] > 0 ? '4px' : '0' }} />
                <span className="text-white/30 text-[9px]">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: status + top products + top cities */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/5 p-5">
          <h3 className="text-white/60 text-[10px] uppercase tracking-widest mb-4">Order Status</h3>
          <div className="space-y-3">
            {stats.statusBreakdown.map(({ status, count }) => (
              <div key={status}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs ${STATUS_COLORS[status]?.split(' ')[0] || 'text-white/40'}`}>{STATUS_LABELS[status]}</span>
                  <span className="text-white/50 text-xs">{count}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${STATUS_BAR[status] || 'bg-white/20'} transition-all`}
                    style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white/60 text-[10px] uppercase tracking-widest">Top Products</h3>
            <Star size={12} className="text-brand-gold" />
          </div>
          {stats.topProducts.length === 0 ? (
            <p className="text-white/20 text-xs">No sales yet</p>
          ) : (
            <div className="space-y-3">
              {stats.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-white/20 text-xs w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs truncate">{p.name}</p>
                    <p className="text-white/30 text-[10px]">{cad(p.revenue)}</p>
                  </div>
                  <span className="text-brand-gold text-xs font-semibold flex-shrink-0">×{p.qty}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/5 border border-white/5 p-5">
          <h3 className="text-white/60 text-[10px] uppercase tracking-widest mb-4">Top Cities</h3>
          {stats.topCities.length === 0 ? (
            <p className="text-white/20 text-xs">No data</p>
          ) : (
            <div className="space-y-3">
              {stats.topCities.map(([city, count]) => (
                <div key={city}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/70 text-xs">{city}</span>
                    <span className="text-white/40 text-xs">{count}</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-brand-gold/50 transition-all"
                      style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white/5 border border-white/5">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-white font-medium text-sm">Recent Orders</h2>
          <Link href="/admin/orders" className="text-brand-gold text-xs tracking-widest uppercase hover:underline">View all →</Link>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-white/5 animate-pulse rounded" />)}</div>
        ) : stats.recentOrders.length === 0 ? (
          <p className="text-white/30 text-sm p-6">No orders yet</p>
        ) : (
          <div className="divide-y divide-white/5">
            {stats.recentOrders.map((order) => (
              <Link key={order._id} href={`/admin/orders`}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-white/3 transition-colors">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">{order.orderNumber}</p>
                  <p className="text-white/40 text-xs">{order.customer.name} · {order.customer.city}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <span className="text-white/60 text-xs hidden sm:block">
                    {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <p className="text-white text-sm font-semibold">{cad(order.total)}</p>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-medium ${STATUS_COLORS[order.status] || 'text-white/40 bg-white/5'}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
