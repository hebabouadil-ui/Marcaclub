'use client'
import { useEffect, useState } from 'react'
import { Download, TrendingUp, ShoppingBag, XCircle } from 'lucide-react'

interface OrderRow {
  _id: string
  orderNumber: string
  customer: { name: string; city: string; phone: string }
  status: string
  total: number
  createdAt: string
  items: Array<{ name: string; size: string; quantity: number; price: number }>
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  shipped: 'Expédié',
  delivered: 'Livré',
  cancelled: 'Annulé',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-400/10',
  confirmed: 'text-blue-400 bg-blue-400/10',
  shipped: 'text-purple-400 bg-purple-400/10',
  delivered: 'text-green-400 bg-green-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
}

export default function ReportsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/orders?month=${month}&year=${year}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data: OrderRow[]) => {
        const filtered = data.filter((o) => {
          const d = new Date(o.createdAt)
          return d.getMonth() + 1 === month && d.getFullYear() === year
        })
        setOrders(filtered)
      })
      .finally(() => setLoading(false))
  }, [month, year])

  const confirmed = orders.filter((o) => ['confirmed', 'shipped', 'delivered'].includes(o.status))
  const cancelled = orders.filter((o) => o.status === 'cancelled')
  const revenue = confirmed.reduce((s, o) => s + o.total, 0)

  const handleExport = async () => {
    setDownloading(true)
    const res = await fetch(`/api/reports?month=${month}&year=${year}`, { credentials: 'include' })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const d = new Date(year, month - 1, 1)
    a.download = `marcaclub-${d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(false)
  }

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ]
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white text-2xl font-semibold">Rapports</h1>
          <p className="text-white/40 text-sm mt-0.5">Export mensuel des commandes et du chiffre d&apos;affaires</p>
        </div>
        <button
          onClick={handleExport}
          disabled={downloading || loading}
          className="flex items-center gap-2 bg-brand-gold text-brand-black px-6 py-2.5 text-sm font-semibold tracking-widest uppercase hover:bg-white transition-colors disabled:opacity-50"
        >
          <Download size={14} />
          {downloading ? 'Export...' : 'Exporter Excel'}
        </button>
      </div>

      {/* Month / Year selector */}
      <div className="flex gap-3 mb-8">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="bg-white/5 border border-white/10 text-white px-4 py-2 text-sm focus:outline-none focus:border-brand-gold"
        >
          {months.map((m, i) => (
            <option key={i + 1} value={i + 1} className="bg-brand-black">{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="bg-white/5 border border-white/10 text-white px-4 py-2 text-sm focus:outline-none focus:border-brand-gold"
        >
          {years.map((y) => (
            <option key={y} value={y} className="bg-brand-black">{y}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total commandes', value: orders.length, icon: ShoppingBag, color: 'text-brand-gold' },
          { label: 'Confirmées / Livrées', value: confirmed.length, icon: TrendingUp, color: 'text-green-400' },
          { label: 'Annulées', value: cancelled.length, icon: XCircle, color: 'text-red-400' },
          { label: 'Chiffre d\'affaires', value: `${revenue.toFixed(0)} MAD`, icon: TrendingUp, color: 'text-green-400' },
        ].map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white/5 border border-white/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/40 text-xs tracking-widest uppercase">{card.label}</p>
                <Icon size={16} className={card.color} />
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>{loading ? '—' : card.value}</p>
            </div>
          )
        })}
      </div>

      {/* Orders table */}
      <div className="bg-white/5 border border-white/5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {['N° Cmd', 'Date', 'Client', 'Ville', 'Articles', 'Total', 'Statut'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-white/40 text-xs uppercase tracking-widest font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-white/30 text-center">Chargement...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-white/30 text-center">Aucune commande ce mois</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white font-mono text-xs">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-white/60 text-xs">{new Date(o.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 text-white">{o.customer.name}</td>
                  <td className="px-4 py-3 text-white/60">{o.customer.city}</td>
                  <td className="px-4 py-3 text-white/60 text-xs max-w-[200px] truncate">
                    {o.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-white">{o.total.toFixed(0)} MAD</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${STATUS_COLORS[o.status] || 'text-white/40'}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
