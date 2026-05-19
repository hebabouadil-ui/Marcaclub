'use client'
import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ShoppingBag, Package, TrendingUp, Clock, Radio,
  AlertTriangle, Ban, Star, BarChart2, Users, CheckCircle, Eye,
} from 'lucide-react'
import Link from 'next/link'

interface Order {
  _id: string
  orderNumber: string
  customer: { name: string; phone: string; city: string }
  items: Array<{ name: string; quantity: number; price: number }>
  total: number
  status: string
  flagged: boolean
  flagReason?: string
  ip?: string
  createdAt: string
}

interface Product {
  _id: string
  name: string
  price: number
  stock: number
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', confirmed: 'Confirmé', shipped: 'Expédié',
  delivered: 'Livré', cancelled: 'Annulé',
}
const STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-400/10',
  confirmed: 'text-blue-400 bg-blue-400/10',
  shipped: 'text-purple-400 bg-purple-400/10',
  delivered: 'text-green-400 bg-green-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
}
const STATUS_BAR: Record<string, string> = {
  pending: 'bg-amber-400',
  confirmed: 'bg-blue-400',
  shipped: 'bg-purple-400',
  delivered: 'bg-green-400',
  cancelled: 'bg-red-400',
}

function fmt(n: number) {
  return n.toLocaleString('fr-MA', { maximumFractionDigits: 0 })
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [liveStatus, setLiveStatus] = useState(false)
  const [loading, setLoading] = useState(true)
  const [visitors, setVisitors] = useState<number | null>(null)
  const [visitorList, setVisitorList] = useState<{ ip: string; page: string; lastSeen: string }[]>([])
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
        .then((d) => {
          setVisitors(d.count ?? 0)
          if (Array.isArray(d.visitors)) setVisitorList(d.visitors)
        })
        .catch(() => {})
    }

    fetchData()
    fetchVisitors()
    const dataInterval = setInterval(fetchData, 30_000)
    const visitorInterval = setInterval(fetchVisitors, 30_000)
    return () => {
      clearInterval(dataInterval)
      clearInterval(visitorInterval)
    }
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
    const flagged = orders.filter((o) => o.flagged)
    const avgOrder = active.length > 0 ? revenue / active.length : 0
    const deliveryRate = orders.length > 0 ? (delivered.length / orders.length) * 100 : 0

    // Revenue last 7 days
    const days: { label: string; value: number; date: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      const dayRevenue = orders
        .filter((o) => {
          const t = new Date(o.createdAt).getTime()
          return t >= d.getTime() && t < next.getTime() &&
            ['confirmed', 'shipped', 'delivered'].includes(o.status)
        })
        .reduce((s, o) => s + o.total, 0)
      days.push({
        label: d.toLocaleDateString('fr-MA', { weekday: 'short' }),
        date: d.toLocaleDateString('fr-MA', { day: 'numeric', month: 'short' }),
        value: dayRevenue,
      })
    }

    // Orders count last 7 days (all statuses)
    const ordersByDay = days.map((d, idx) => {
      const dd = new Date(); dd.setDate(dd.getDate() - (6 - idx)); dd.setHours(0, 0, 0, 0)
      const next = new Date(dd); next.setDate(next.getDate() + 1)
      return orders.filter((o) => {
        const t = new Date(o.createdAt).getTime()
        return t >= dd.getTime() && t < next.getTime()
      }).length
    })

    // Top products by sales count
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {}
    for (const o of active) {
      for (const item of o.items) {
        if (!productSales[item.name]) productSales[item.name] = { name: item.name, qty: 0, revenue: 0 }
        productSales[item.name].qty += item.quantity
        productSales[item.name].revenue += item.price * item.quantity
      }
    }
    const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5)

    // Status breakdown
    const statusBreakdown = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((s) => ({
      status: s,
      count: orders.filter((o) => o.status === s).length,
    }))

    // Top cities
    const cities: Record<string, number> = {}
    for (const o of orders) {
      const c = o.customer.city?.trim() || 'Inconnue'
      cities[c] = (cities[c] || 0) + 1
    }
    const topCities = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 5)

    // Unique customers
    const phones = new Set(orders.map((o) => (o.customer.phone || '').replace(/\D/g, '').slice(-9)).filter(Boolean))

    return {
      revenue, avgOrder, deliveryRate,
      total: orders.length, pending: pending.length, cancelled: cancelled.length,
      flagged: flagged.length, delivered: delivered.length,
      uniqueCustomers: phones.size,
      recentOrders: orders.slice(0, 6),
      revenueByDay: days,
      ordersByDay,
      topProducts,
      statusBreakdown,
      topCities,
    }
  }, [orders])

  const maxRevDay = Math.max(...(stats?.revenueByDay.map((d) => d.value) ?? [1]), 1)
  const maxOrdDay = Math.max(...(stats?.ordersByDay ?? [1]), 1)

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold">Dashboard</h1>
          <p className="text-white/40 text-sm mt-0.5">
            {lastUpdated
              ? <>Mis à jour à {lastUpdated.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse align-middle ml-1" /></>
              : 'Vue d\'ensemble de votre boutique'
            }
          </p>
        </div>
        <button
          onClick={toggleLive}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold tracking-wider transition-all ${
            liveStatus ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          <Radio size={14} className={liveStatus ? 'live-dot' : ''} />
          {liveStatus ? 'LIVE ON' : 'LIVE OFF'}
        </button>
      </div>

      {/* Flagged alert */}
      {!loading && stats.flagged > 0 && (
        <Link href="/admin/orders?filter=flagged" className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 px-5 py-3 hover:bg-red-500/15 transition-colors">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-sm font-semibold">{stats.flagged} commande{stats.flagged > 1 ? 's' : ''} suspecte{stats.flagged > 1 ? 's' : ''} à vérifier</span>
          <span className="text-red-400/50 text-xs ml-auto">Voir →</span>
        </Link>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Chiffre d'affaires", value: loading ? '—' : `${fmt(stats.revenue)} MAD`, icon: TrendingUp, color: 'text-green-400', sub: 'commandes actives' },
          { label: 'Commandes', value: loading ? '—' : fmt(stats.total), icon: ShoppingBag, color: 'text-brand-gold', sub: `${loading ? '—' : stats.pending} en attente` },
          { label: 'Clients uniques', value: loading ? '—' : fmt(stats.uniqueCustomers), icon: Users, color: 'text-blue-400', sub: 'par téléphone' },
          { label: 'Taux livraison', value: loading ? '—' : `${stats.deliveryRate.toFixed(0)}%`, icon: CheckCircle, color: 'text-purple-400', sub: `${loading ? '—' : stats.delivered} livrées` },
          { label: 'Panier moyen', value: loading ? '—' : `${fmt(stats.avgOrder)} MAD`, icon: BarChart2, color: 'text-cyan-400', sub: 'commandes confirmées' },
          { label: 'Annulées', value: loading ? '—' : fmt(stats.cancelled), icon: Ban, color: 'text-red-400', sub: `${loading ? '—' : stats.total > 0 ? ((stats.cancelled / stats.total) * 100).toFixed(0) : 0}% du total` },
          { label: 'Produits', value: loading ? '—' : fmt(products.length), icon: Package, color: 'text-amber-400', sub: `${loading ? '—' : products.filter((p) => p.stock === 0).length} rupture` },
          { label: 'Suspectes', value: loading ? '—' : fmt(stats.flagged), icon: AlertTriangle, color: 'text-orange-400', sub: 'à vérifier' },
          { label: 'Sur le site maintenant', value: visitors === null ? '—' : fmt(visitors), icon: Eye, color: 'text-green-300', sub: 'visiteurs actifs (2 min)', live: true },
        ].map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/5 border border-white/5 p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-white/40 text-[10px] tracking-widest uppercase">{card.label}</p>
                  {'live' in card && card.live && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                    </span>
                  )}
                </div>
                <Icon size={14} className={card.color} />
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-white/25 text-[10px] mt-1">{card.sub}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Active visitors IP list */}
      {visitorList.length > 0 && (
        <div className="bg-white/5 border border-white/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <h3 className="text-white/60 text-xs uppercase tracking-widest">Visiteurs actifs — adresses IP</h3>
            <span className="ml-auto text-green-400 text-xs font-bold">{visitorList.length} en ligne</span>
          </div>
          <div className="divide-y divide-white/5">
            {visitorList.map((v, i) => (
              <div key={i} className="flex items-center justify-between py-2 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Eye size={12} className="text-green-400 shrink-0" />
                  <span className="text-white font-mono text-xs">{v.ip || 'unknown'}</span>
                </div>
                <span className="text-white/40 text-xs truncate max-w-[200px]">{v.page}</span>
                <span className="text-white/25 text-[10px] shrink-0">
                  {new Date(v.lastSeen).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue last 7 days */}
        <div className="bg-white/5 border border-white/5 p-5">
          <h3 className="text-white/60 text-xs uppercase tracking-widest mb-4">Revenus — 7 derniers jours</h3>
          {loading ? (
            <div className="skeleton h-40 rounded" />
          ) : (
            <div className="flex items-end gap-2 h-40">
              {stats.revenueByDay.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-brand-black border border-white/10 px-2 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {fmt(d.value)} MAD
                  </div>
                  <div
                    className="w-full bg-brand-gold/70 hover:bg-brand-gold transition-colors rounded-sm"
                    style={{ height: `${maxRevDay > 0 ? (d.value / maxRevDay) * 100 : 0}%`, minHeight: d.value > 0 ? '4px' : '0' }}
                  />
                  <span className="text-white/30 text-[9px] capitalize">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders count last 7 days */}
        <div className="bg-white/5 border border-white/5 p-5">
          <h3 className="text-white/60 text-xs uppercase tracking-widest mb-4">Commandes — 7 derniers jours</h3>
          {loading ? (
            <div className="skeleton h-40 rounded" />
          ) : (
            <div className="flex items-end gap-2 h-40">
              {stats.revenueByDay.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-brand-black border border-white/10 px-2 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {stats.ordersByDay[i]} commande{stats.ordersByDay[i] !== 1 ? 's' : ''}
                  </div>
                  <div
                    className="w-full bg-blue-400/60 hover:bg-blue-400 transition-colors rounded-sm"
                    style={{ height: `${maxOrdDay > 0 ? (stats.ordersByDay[i] / maxOrdDay) * 100 : 0}%`, minHeight: stats.ordersByDay[i] > 0 ? '4px' : '0' }}
                  />
                  <span className="text-white/30 text-[9px] capitalize">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Status breakdown */}
        <div className="bg-white/5 border border-white/5 p-5">
          <h3 className="text-white/60 text-xs uppercase tracking-widest mb-4">Statuts</h3>
          {loading ? <div className="skeleton h-32 rounded" /> : (
            <div className="space-y-2.5">
              {stats.statusBreakdown.map(({ status, count }) => (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${STATUS_COLORS[status]?.split(' ')[0] || 'text-white/40'}`}>{STATUS_LABELS[status]}</span>
                    <span className="text-white/50 text-xs">{count}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${STATUS_BAR[status] || 'bg-white/20'} transition-all`}
                      style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="bg-white/5 border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white/60 text-xs uppercase tracking-widest">Top produits</h3>
            <Star size={12} className="text-brand-gold" />
          </div>
          {loading ? <div className="skeleton h-32 rounded" /> : stats.topProducts.length === 0 ? (
            <p className="text-white/20 text-xs">Aucune vente</p>
          ) : (
            <div className="space-y-3">
              {stats.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-white/20 text-xs w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs truncate">{p.name}</p>
                    <p className="text-white/30 text-[10px]">{fmt(p.revenue)} MAD</p>
                  </div>
                  <span className="text-brand-gold text-xs font-semibold flex-shrink-0">×{p.qty}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top cities */}
        <div className="bg-white/5 border border-white/5 p-5">
          <h3 className="text-white/60 text-xs uppercase tracking-widest mb-4">Top villes</h3>
          {loading ? <div className="skeleton h-32 rounded" /> : stats.topCities.length === 0 ? (
            <p className="text-white/20 text-xs">Aucune donnée</p>
          ) : (
            <div className="space-y-2.5">
              {stats.topCities.map(([city, count]) => (
                <div key={city}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/70 text-xs">{city}</span>
                    <span className="text-white/40 text-xs">{count}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-gold/50 transition-all"
                      style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                    />
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
          <h2 className="text-white font-medium text-sm">Dernières commandes</h2>
          <Link href="/admin/orders" className="text-brand-gold text-xs tracking-widest uppercase hover:underline">
            Voir tout
          </Link>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
        ) : stats.recentOrders.length === 0 ? (
          <p className="text-white/30 text-sm p-6">Aucune commande pour l&apos;instant</p>
        ) : (
          <div className="divide-y divide-white/5">
            {stats.recentOrders.map((order) => (
              <div key={order._id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  {order.flagged && <AlertTriangle size={12} className="text-orange-400 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium">{order.orderNumber}</p>
                    <p className="text-white/40 text-xs truncate">{order.customer.name} — {order.customer.city}</p>
                    {order.ip && <p className="text-white/25 font-mono text-[10px]">{order.ip}</p>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-white text-sm">{fmt(order.total)} MAD</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_COLORS[order.status] || 'text-white/40'}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
