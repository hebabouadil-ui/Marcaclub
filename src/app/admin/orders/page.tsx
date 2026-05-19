'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ChevronDown, Search, AlertTriangle, ShieldCheck, Flag, Ban, Trash2, Shield, Bot, Loader2, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'

const STATUSES = ['all', 'flagged', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', confirmed: 'Confirmé', shipped: 'Expédié',
  delivered: 'Livré', cancelled: 'Annulé',
}
const statusColors: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-400/10',
  confirmed: 'text-blue-400 bg-blue-400/10',
  shipped: 'text-purple-400 bg-purple-400/10',
  delivered: 'text-green-400 bg-green-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
}

interface AiResult {
  verdict: 'SAFE' | 'SUSPICIOUS' | 'HIGH_RISK'
  confidence: number
  reasoning: string
  signals: string[]
  recommendation: string
}

interface Order {
  _id: string
  orderNumber: string
  customer: { name: string; phone: string; city: string; address: string; email?: string }
  items: Array<{ name: string; quantity: number; size: string; price: number }>
  total: number
  status: string
  flagged: boolean
  trusted?: boolean
  flagSeverity?: 'low' | 'medium' | 'high'
  flagReason?: string
  flaggedOrderNumbers?: string[]
  ip?: string
  aiVerdict?: 'SAFE' | 'SUSPICIOUS' | 'HIGH_RISK'
  aiConfidence?: number
  aiReasoning?: string
  aiAnalyzedAt?: string
  createdAt: string
}

interface BlocklistEntry {
  _id: string
  phone?: string
  name?: string
  address?: string
  city?: string
  reason?: string
  createdAt: string
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [filtered, setFiltered] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [blocklist, setBlocklist] = useState<BlocklistEntry[]>([])
  const [showBlocklist, setShowBlocklist] = useState(false)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [aiResults, setAiResults] = useState<Record<string, AiResult>>({})

  useEffect(() => {
    fetch('/api/orders', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return
        setOrders(data)
        setFiltered(data)
      })
      .finally(() => setLoading(false))
    fetch('/api/blocklist', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setBlocklist(data) })
  }, [])

  useEffect(() => {
    let data = orders
    if (filter === 'flagged') data = data.filter((o) => o.flagged)
    else if (filter !== 'all') data = data.filter((o) => o.status === filter)
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
      toast.success('Statut mis à jour')
    } else {
      toast.error('Erreur')
    }
  }

  const unflag = async (id: string) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unflag' }),
    })
    if (res.ok) {
      setOrders((prev) => prev.map((o) => o._id === id
        ? { ...o, flagged: false, trusted: true, flagReason: undefined, flagSeverity: undefined, flaggedOrderNumbers: [], aiVerdict: undefined, aiConfidence: undefined, aiReasoning: undefined }
        : o
      ))
      toast.success('Commande marquée comme fiable ✓')
    } else {
      toast.error('Erreur')
    }
  }

  const blacklistOrder = async (order: Order) => {
    const res = await fetch('/api/blocklist', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: order.customer.phone.replace(/\D/g, ''),
        name: order.customer.name,
        address: order.customer.address || undefined,
        city: order.customer.city,
        reason: `Blacklisté depuis commande ${order.orderNumber}`,
      }),
    })
    if (res.ok) {
      toast.success('Client blacklisté — redirection vers Risques élevés')
      setTimeout(() => router.push('/admin/high-risk'), 800)
    } else {
      toast.error('Erreur')
    }
  }

  const removeBlock = async (id: string) => {
    const res = await fetch('/api/blocklist', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setBlocklist((prev) => prev.filter((e) => e._id !== id))
      toast.success('Entrée supprimée')
    }
  }

  const analyzeWithAI = async (order: Order) => {
    setAiLoading(order._id)
    // Auto-expand the order to show results
    setExpanded(order._id)
    try {
      const res = await fetch('/api/ai-risk', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order._id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || 'Erreur analyse IA', { duration: 6000 })
        setAiLoading(null)
        return
      }
      const result: AiResult = data
      setAiResults((prev) => ({ ...prev, [order._id]: result }))
      // Update order in list with new AI verdict
      setOrders((prev) => prev.map((o) => o._id === order._id
        ? { ...o, aiVerdict: result.verdict, aiConfidence: result.confidence, aiReasoning: result.reasoning }
        : o
      ))
      toast.success(`Analyse IA: ${result.verdict}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'analyse IA')
    } finally {
      setAiLoading(null)
    }
  }

  const blockIP = async (order: Order) => {
    if (!order.ip) return
    const res = await fetch('/api/blocked-ips', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip: order.ip,
        reason: `Bloqué depuis commande ${order.orderNumber}`,
        orderNumbers: [order.orderNumber],
      }),
    })
    if (res.ok) {
      toast.success(`IP ${order.ip} bloquée — redirection vers Risques élevés`)
      setTimeout(() => router.push('/admin/high-risk'), 800)
    } else toast.error('Erreur')
  }

  const flaggedCount = orders.filter((o) => o.flagged).length
  const untouchedCount = orders.filter((o) => o.status === 'pending' && !o.flagged && !o.trusted).length
  const highRiskCount = orders.filter((o) => !o.trusted && (o.flagSeverity === 'high' || o.aiVerdict === 'HIGH_RISK')).length

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      {/* Notification bar */}
      {(untouchedCount > 0 || highRiskCount > 0) && (
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          {untouchedCount > 0 && (
            <div className="flex-1 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-2.5">
              <Clock size={13} className="text-amber-400 shrink-0" />
              <span className="text-amber-400 text-sm font-semibold">{untouchedCount} en attente non traitée{untouchedCount > 1 ? 's' : ''}</span>
            </div>
          )}
          {highRiskCount > 0 && (
            <Link href="/admin/high-risk" className="flex-1 flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-4 py-2.5 hover:bg-red-500/15 transition-colors">
              <AlertTriangle size={13} className="text-red-400 shrink-0" />
              <span className="text-red-400 text-sm font-semibold">{highRiskCount} risque{highRiskCount > 1 ? 's' : ''} élevé{highRiskCount > 1 ? 's' : ''} en attente</span>
              <span className="text-red-400/50 text-xs ml-auto">→</span>
            </Link>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-2xl font-semibold">Commandes</h1>
        <div className="flex items-center gap-3">
          {flaggedCount > 0 && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 px-4 py-2">
              <AlertTriangle size={14} className="text-red-400" />
              <span className="text-red-400 text-sm font-semibold">{flaggedCount} doublon{flaggedCount > 1 ? 's' : ''} à vérifier</span>
            </div>
          )}
          <button
            onClick={() => setShowBlocklist((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 text-xs tracking-widest uppercase font-semibold transition-colors border ${
              showBlocklist ? 'bg-red-500 text-white border-red-500' : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
            }`}
          >
            <Ban size={12} />
            Blacklist{blocklist.length > 0 ? ` (${blocklist.length})` : ''}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Nom, téléphone, N° commande..."
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
              className={`flex-shrink-0 px-4 py-2 text-xs tracking-widest uppercase transition-colors flex items-center gap-1.5 ${
                filter === s
                  ? s === 'flagged' ? 'bg-red-500 text-white' : 'bg-brand-gold text-brand-black'
                  : s === 'flagged' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {s === 'flagged' && <Flag size={10} />}
              {s === 'all' ? 'Tous' : s === 'flagged' ? `Doublons${flaggedCount > 0 ? ` (${flaggedCount})` : ''}` : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-16 rounded" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-white/30 text-center py-12">Aucune commande</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div
              key={order._id}
              className={`border transition-colors ${
                order.flagged
                  ? order.flagSeverity === 'high'   ? 'bg-red-500/5 border-red-500/30'
                  : order.flagSeverity === 'medium' ? 'bg-orange-500/5 border-orange-500/30'
                  :                                   'bg-yellow-500/5 border-yellow-500/30'
                  : 'bg-white/5 border-white/5'
              }`}
            >
              {/* Flag warning banner */}
              {order.flagged && (() => {
                const sev = order.flagSeverity || 'medium'
                const colors = {
                  high:   { bg: 'bg-red-500/10',    border: 'border-red-500/20',    text: 'text-red-400',    sub: 'text-red-300/70',    label: 'RISQUE ÉLEVÉ' },
                  medium: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', sub: 'text-orange-300/70', label: 'RISQUE MOYEN' },
                  low:    { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', sub: 'text-yellow-300/70', label: 'RISQUE FAIBLE' },
                }[sev]
                return (
                  <div className={`flex items-start gap-3 px-5 py-3 ${colors.bg} border-b ${colors.border}`}>
                    <AlertTriangle size={14} className={`${colors.text} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className={`${colors.text} text-xs font-semibold uppercase tracking-widest mb-0.5`}>{colors.label} — confirmation requise</p>
                      <p className={`${colors.sub} text-xs`}>{order.flagReason}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => unflag(order._id)}
                        className="flex items-center gap-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1.5 text-xs font-semibold tracking-widest uppercase transition-colors"
                      >
                        <ShieldCheck size={12} />
                        Fiable
                      </button>
                      <button
                        onClick={() => blacklistOrder(order)}
                        className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 text-xs font-semibold tracking-widest uppercase transition-colors"
                      >
                        <Ban size={12} />
                        Blacklister
                      </button>
                      {order.ip && (
                        <button
                          onClick={() => blockIP(order)}
                          className="flex items-center gap-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-1.5 text-xs font-semibold tracking-widest uppercase transition-colors"
                        >
                          <Shield size={12} />
                          Bloquer IP
                        </button>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* AI verdict badge on collapsed row */}
              {order.aiVerdict && expanded !== order._id && (
                <div className={`px-5 py-2 border-t flex items-center gap-2 ${
                  order.aiVerdict === 'SAFE' ? 'border-green-500/10 bg-green-500/5' :
                  order.aiVerdict === 'HIGH_RISK' ? 'border-red-500/10 bg-red-500/5' :
                  'border-orange-500/10 bg-orange-500/5'
                }`}>
                  <Bot size={11} className={
                    order.aiVerdict === 'SAFE' ? 'text-green-400' :
                    order.aiVerdict === 'HIGH_RISK' ? 'text-red-400' : 'text-orange-400'
                  } />
                  <span className={`text-[10px] font-semibold uppercase tracking-widest ${
                    order.aiVerdict === 'SAFE' ? 'text-green-400' :
                    order.aiVerdict === 'HIGH_RISK' ? 'text-red-400' : 'text-orange-400'
                  }`}>IA: {order.aiVerdict.replace('_', ' ')} — {order.aiConfidence}%</span>
                </div>
              )}

              <button
                onClick={() => setExpanded(expanded === order._id ? null : order._id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm">{order.orderNumber}</p>
                      {order.flagged && <Flag size={10} className="text-red-400 flex-shrink-0" />}
                      {order.trusted && !order.flagged && (
                        <span className="flex items-center gap-0.5 text-green-400/70 text-[10px]">
                          <ShieldCheck size={10} />fiable
                        </span>
                      )}
                    </div>
                    <p className="text-white/40 text-xs mt-0.5 truncate">
                      {order.customer.name} — {order.customer.city} — {order.customer.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <span className="text-white text-sm hidden sm:block">{order.total.toFixed(0)} MAD</span>
                  <span className={`text-[10px] px-2 py-1 rounded-full uppercase tracking-wider ${statusColors[order.status] || 'text-white/40'}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); analyzeWithAI(order) }}
                    disabled={aiLoading === order._id}
                    title="Analyser avec l'IA"
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold tracking-widest uppercase transition-colors border ${
                      order.aiVerdict === 'SAFE' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                      order.aiVerdict === 'HIGH_RISK' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                      order.aiVerdict === 'SUSPICIOUS' ? 'border-orange-500/30 text-orange-400 bg-orange-500/10' :
                      'border-white/10 text-white/40 hover:border-brand-gold/50 hover:text-brand-gold'
                    }`}
                  >
                    {aiLoading === order._id
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Bot size={11} />
                    }
                    <span className="hidden sm:inline">IA</span>
                  </button>
                  <ChevronDown size={14} className={`text-white/40 transition-transform ${expanded === order._id ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {expanded === order._id && (
                <div className="px-5 pb-5 border-t border-white/5 pt-4">
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Client</p>
                      <p className="text-white text-sm">{order.customer.name}</p>
                      <p className="text-white/50 text-sm">{order.customer.phone}</p>
                      <p className="text-white/50 text-sm">{order.customer.city}</p>
                      {order.customer.address && <p className="text-white/40 text-xs mt-1">{order.customer.address}</p>}
                      {order.customer.email && <p className="text-white/40 text-xs">{order.customer.email}</p>}
                      {order.ip && (
                        <p className="text-purple-400/60 font-mono text-xs mt-1 flex items-center gap-1">
                          <Shield size={10} />
                          {order.ip}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Articles</p>
                      {order.items.map((item, i) => (
                        <p key={i} className="text-white/70 text-sm">
                          {item.name} — {item.size} × {item.quantity}
                        </p>
                      ))}
                      <p className="text-brand-gold font-semibold mt-2">Total: {order.total.toFixed(0)} MAD</p>
                    </div>
                  </div>

                  {order.flagged && order.flaggedOrderNumbers && order.flaggedOrderNumbers.length > 0 && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/20 p-3">
                      <p className="text-red-400 text-xs font-semibold uppercase tracking-widest mb-1">Commandes similaires</p>
                      <p className="text-red-300/60 text-xs">{order.flaggedOrderNumbers.join(', ')}</p>
                    </div>
                  )}

                  {/* AI Analysis panel */}
                  {(() => {
                    const ai = aiResults[order._id] || (order.aiVerdict ? { verdict: order.aiVerdict, confidence: order.aiConfidence || 0, reasoning: order.aiReasoning || '', signals: [], recommendation: '' } : null)
                    if (aiLoading === order._id) return (
                      <div className="mb-4 bg-brand-gold/5 border border-brand-gold/20 p-4 flex items-center gap-3">
                        <Loader2 size={16} className="text-brand-gold animate-spin" />
                        <div>
                          <p className="text-brand-gold text-xs font-semibold uppercase tracking-widest">Analyse IA en cours...</p>
                          <p className="text-white/30 text-xs mt-0.5">L'agent interroge l'historique client, l'IP, et les listes noires</p>
                        </div>
                      </div>
                    )
                    if (!ai) return (
                      <div className="mb-4">
                        <button
                          onClick={() => analyzeWithAI(order)}
                          className="flex items-center gap-2 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/20 text-brand-gold px-4 py-2.5 text-xs font-semibold tracking-widest uppercase transition-colors w-full justify-center"
                        >
                          <Bot size={14} />
                          Analyser avec l'agent IA
                        </button>
                      </div>
                    )
                    const cfg = {
                      SAFE:      { bg: 'bg-green-500/10',  border: 'border-green-500/20',  text: 'text-green-400',  Icon: CheckCircle2,  label: 'SAFE — Livraison recommandée' },
                      SUSPICIOUS:{ bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', Icon: AlertCircle,   label: 'SUSPICIEUX — Vérification requise' },
                      HIGH_RISK: { bg: 'bg-red-500/10',    border: 'border-red-500/20',    text: 'text-red-400',    Icon: XCircle,       label: 'RISQUE ÉLEVÉ — Ne pas livrer' },
                    }[ai.verdict]
                    return (
                      <div className={`mb-4 ${cfg.bg} border ${cfg.border} p-4`}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <cfg.Icon size={16} className={cfg.text} />
                            <p className={`${cfg.text} text-xs font-semibold uppercase tracking-widest`}>{cfg.label}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-right">
                              <span className={`text-lg font-bold ${cfg.text}`}>{ai.confidence}%</span>
                              <p className="text-white/30 text-[10px]">confiance</p>
                            </div>
                            <button onClick={() => analyzeWithAI(order)} className={`${cfg.text} hover:opacity-70 transition-opacity`} title="Relancer l'analyse">
                              <Bot size={14} />
                            </button>
                          </div>
                        </div>
                        {ai.signals && ai.signals.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-1.5">
                            {ai.signals.map((s, i) => (
                              <span key={i} className={`text-[10px] px-2 py-0.5 border ${cfg.border} ${cfg.text} opacity-80`}>{s}</span>
                            ))}
                          </div>
                        )}
                        {ai.recommendation && (
                          <p className={`${cfg.text} text-xs font-semibold mb-2`}>→ {ai.recommendation}</p>
                        )}
                        <details className="group">
                          <summary className="text-white/30 text-[10px] uppercase tracking-widest cursor-pointer hover:text-white/50 transition-colors select-none">
                            Voir le raisonnement complet ▾
                          </summary>
                          <p className="text-white/40 text-xs mt-2 whitespace-pre-wrap leading-relaxed">{ai.reasoning}</p>
                        </details>
                        {order.aiAnalyzedAt && (
                          <p className="text-white/20 text-[10px] mt-2">
                            Analysé le {new Date(order.aiAnalyzedAt).toLocaleString('fr-MA')}
                          </p>
                        )}
                      </div>
                    )
                  })()}

                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Changer statut</p>
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
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Blocklist panel */}
      {showBlocklist && (
        <div className="mt-8 border border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-red-500/20">
            <Ban size={14} className="text-red-400" />
            <h2 className="text-red-400 text-sm font-semibold uppercase tracking-widest">Clients blacklistés</h2>
          </div>
          {blocklist.length === 0 ? (
            <p className="text-white/30 text-sm px-5 py-6 text-center">Aucun client blacklisté</p>
          ) : (
            <div className="divide-y divide-red-500/10">
              {blocklist.map((entry) => (
                <div key={entry._id} className="flex items-start justify-between px-5 py-3 gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {entry.name && <span className="text-white text-sm font-medium">{entry.name}</span>}
                      {entry.phone && <span className="text-white/50 text-sm">📞 {entry.phone}</span>}
                      {entry.city && <span className="text-white/40 text-xs">{entry.city}</span>}
                    </div>
                    {entry.address && <p className="text-white/30 text-xs mt-0.5">{entry.address}</p>}
                    {entry.reason && <p className="text-red-400/50 text-xs mt-0.5 italic">{entry.reason}</p>}
                  </div>
                  <button
                    onClick={() => removeBlock(entry._id)}
                    className="flex-shrink-0 text-white/30 hover:text-red-400 transition-colors p-1"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
