'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag, Package, TrendingUp, Clock, Radio } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  totalOrders: number
  pendingOrders: number
  totalProducts: number
  totalRevenue: number
  recentOrders: Array<{
    _id: string
    orderNumber: string
    customer: { name: string }
    total: number
    status: string
    createdAt: string
  }>
  liveStatus: boolean
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [liveStatus, setLiveStatus] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, productsRes, liveRes] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/products?all=true'),
          fetch('/api/live'),
        ])
        const orders = ordersRes.ok ? await ordersRes.json() : []
        const products = productsRes.ok ? await productsRes.json() : []
        const live = liveRes.ok ? await liveRes.json() : { liveStatus: false }

        setLiveStatus(live.liveStatus)
        setStats({
          totalOrders: orders.length,
          pendingOrders: orders.filter((o: { status: string }) => o.status === 'pending').length,
          totalProducts: products.length,
          totalRevenue: orders.reduce((sum: number, o: { total: number }) => sum + o.total, 0),
          recentOrders: orders.slice(0, 5),
          liveStatus: live.liveStatus,
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const toggleLive = async () => {
    const newStatus = !liveStatus
    setLiveStatus(newStatus)
    await fetch('/api/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ liveStatus: newStatus }),
    })
  }

  const statCards = [
    { label: 'Commandes totales', value: stats?.totalOrders ?? 0, icon: ShoppingBag, color: 'text-brand-gold' },
    { label: 'En attente', value: stats?.pendingOrders ?? 0, icon: Clock, color: 'text-amber-400' },
    { label: 'Produits', value: stats?.totalProducts ?? 0, icon: Package, color: 'text-blue-400' },
    {
      label: 'Chiffre d\'affaires',
      value: `${(stats?.totalRevenue ?? 0).toFixed(0)} DZD`,
      icon: TrendingUp,
      color: 'text-green-400',
    },
  ]

  const statusColors: Record<string, string> = {
    pending: 'text-amber-400 bg-amber-400/10',
    confirmed: 'text-blue-400 bg-blue-400/10',
    shipped: 'text-purple-400 bg-purple-400/10',
    delivered: 'text-green-400 bg-green-400/10',
    cancelled: 'text-red-400 bg-red-400/10',
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white text-2xl font-semibold">Dashboard</h1>
          <p className="text-white/40 text-sm mt-0.5">Vue d&apos;ensemble de votre boutique</p>
        </div>
        <button
          onClick={toggleLive}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold tracking-wider transition-all ${
            liveStatus
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          <Radio size={14} className={liveStatus ? 'live-dot' : ''} />
          {liveStatus ? 'LIVE ON' : 'LIVE OFF'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/5 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/40 text-xs tracking-widest uppercase">{card.label}</p>
                <Icon size={16} className={card.color} />
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>
                {loading ? <span className="skeleton w-16 h-6 block rounded" /> : card.value}
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* Recent orders */}
      <div className="bg-white/5 border border-white/5">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-white font-medium">Dernières commandes</h2>
          <Link href="/admin/orders" className="text-brand-gold text-xs tracking-widest uppercase hover:underline">
            Voir tout
          </Link>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-12 rounded" />
            ))}
          </div>
        ) : stats?.recentOrders.length === 0 ? (
          <p className="text-white/30 text-sm p-6">Aucune commande pour l&apos;instant</p>
        ) : (
          <div className="divide-y divide-white/5">
            {stats?.recentOrders.map((order) => (
              <div key={order._id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-white text-sm font-medium">{order.orderNumber}</p>
                  <p className="text-white/40 text-xs mt-0.5">{order.customer.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm">{order.total.toFixed(0)} DZD</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${statusColors[order.status] || 'text-white/40'}`}>
                    {order.status}
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
