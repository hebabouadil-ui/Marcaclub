'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, Ban, Shield, ShieldCheck, Trash2, Bot, ChevronDown, XCircle } from 'lucide-react'

interface Order {
  _id: string
  orderNumber: string
  customer: { name: string; phone: string; city: string; address: string; email?: string }
  items: Array<{ name: string; quantity: number; size: string; price: number }>
  total: number
  status: string
  flagged: boolean
  flagSeverity?: 'low' | 'medium' | 'high'
  flagReason?: string
  ip?: string
  aiVerdict?: 'SAFE' | 'SUSPICIOUS' | 'HIGH_RISK'
  aiConfidence?: number
  aiReasoning?: string
  aiAnalyzedAt?: string
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', shipped: 'Shipped',
  delivered: 'Delivered', cancelled: 'Cancelled',
}

export default function HighRiskPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/orders', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: Order[]) => {
        if (!Array.isArray(data)) return
        const risky = data.filter((o) =>
          o.aiVerdict === 'HIGH_RISK' ||
          o.flagSeverity === 'high' ||
          (o.flagged && !o.aiVerdict)
        ).sort((a, b) => {
          // HIGH_RISK AI verdict first, then high severity, then others
          const scoreA = a.aiVerdict === 'HIGH_RISK' ? 3 : a.flagSeverity === 'high' ? 2 : 1
          const scoreB = b.aiVerdict === 'HIGH_RISK' ? 3 : b.flagSeverity === 'high' ? 2 : 1
          return scoreB - scoreA || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
        setOrders(risky)
      })
      .finally(() => setLoading(false))
  }, [])

  const runAnalysis = async (order: Order) => {
    setAnalyzing(order._id)
    setExpanded(order._id)
    try {
      const res = await fetch('/api/ai-risk', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order._id }),
      })
      const result = await res.json()
      if (!res.ok) { toast.error(result.message || 'Error'); return }
      setOrders((prev) => prev.map((o) => o._id === order._id
        ? { ...o, aiVerdict: result.verdict, aiConfidence: result.confidence, aiReasoning: result.reasoning, aiAnalyzedAt: new Date().toISOString() }
        : o
      ))
      toast.success(`IA: ${result.verdict}`)
    } catch { toast.error('Error') }
    finally { setAnalyzing(null) }
  }

  const blacklist = async (order: Order) => {
    const res = await fetch('/api/blocklist', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: order.customer.phone.replace(/\D/g, ''),
        name: order.customer.name,
        city: order.customer.city,
        address: order.customer.address || undefined,
        reason: `Blacklisted — order ${order.orderNumber} (HIGH RISK)`,
      }),
    })
    if (res.ok) {
      toast.success('Customer blacklisted')
      if (order.ip) await blockIP(order.ip, order.orderNumber)
    } else toast.error('Error')
  }

  const blockIP = async (ip: string, orderNumber: string) => {
    await fetch('/api/blocked-ips', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, reason: `Blocked — order ${orderNumber} (HIGH RISK)`, orderNumbers: [orderNumber] }),
    })
    toast.success(`IP ${ip} blocked`)
  }

  const clearFlag = async (id: string) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unflag' }),
    })
    if (res.ok) {
      setOrders((prev) => prev.filter((o) => o._id !== id))
      toast.success('Order removed from high risk')
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <XCircle size={22} className="text-red-400" />
        <h1 className="text-white text-2xl font-semibold">High Risk Orders</h1>
      </div>
      <p className="text-white/40 text-sm mb-8">
        All orders flagged HIGH or analyzed as HIGH_RISK by the AI agent
      </p>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-20 rounded" />)}</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldCheck size={48} className="text-green-400/40 mb-4" />
          <p className="text-white/40 text-lg">No high risk orders detected</p>
          <p className="text-white/20 text-sm mt-1">All orders are within normal parameters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isAiHigh = order.aiVerdict === 'HIGH_RISK'
            const conf = order.aiConfidence
            return (
              <div key={order._id} className="border border-red-500/30 bg-red-500/5">
                {/* Top risk banner */}
                <div className="flex items-start gap-3 px-5 py-3 bg-red-500/10 border-b border-red-500/20">
                  <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-red-400 text-xs font-semibold uppercase tracking-widest">HIGH RISK</span>
                      {isAiHigh && conf !== undefined && (
                        <span className="bg-red-500/20 text-red-300 text-[10px] px-2 py-0.5 font-bold">
                          AI {conf}% confidence
                        </span>
                      )}
                      {order.ip && (
                        <span className="text-purple-400/60 font-mono text-[10px] flex items-center gap-1">
                          <Shield size={9} />{order.ip}
                        </span>
                      )}
                    </div>
                    <p className="text-red-300/60 text-xs truncate">{order.flagReason || order.aiReasoning?.split('\n')[0]}</p>
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => runAnalysis(order)}
                      disabled={analyzing === order._id}
                      className="flex items-center gap-1 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/20 text-brand-gold px-2.5 py-1.5 text-[10px] font-semibold tracking-widest uppercase transition-colors"
                    >
                      <Bot size={10} />
                      {analyzing === order._id ? '...' : 'IA'}
                    </button>
                    <button
                      onClick={() => blacklist(order)}
                      className="flex items-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2.5 py-1.5 text-[10px] font-semibold tracking-widest uppercase transition-colors"
                    >
                      <Ban size={10} />
                      Block
                    </button>
                    <button
                      onClick={() => clearFlag(order._id)}
                      className="flex items-center gap-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-2.5 py-1.5 text-[10px] font-semibold tracking-widest uppercase transition-colors"
                    >
                      <ShieldCheck size={10} />
                      Trust
                    </button>
                  </div>
                </div>

                {/* Order row */}
                <button
                  onClick={() => setExpanded(expanded === order._id ? null : order._id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm">{order.orderNumber}</p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {order.customer.name} — {order.customer.city} — {order.customer.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-white text-sm hidden sm:block">{order.total.toFixed(0)} CA$</span>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-amber-400/10 text-amber-400 uppercase tracking-wider">
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                    <ChevronDown size={14} className={`text-white/40 transition-transform ${expanded === order._id ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Expanded detail */}
                {expanded === order._id && (
                  <div className="px-5 pb-5 border-t border-red-500/10 pt-4 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Customer</p>
                        <p className="text-white text-sm">{order.customer.name}</p>
                        <p className="text-white/50 text-sm">{order.customer.phone}</p>
                        <p className="text-white/50 text-sm">{order.customer.city}</p>
                        {order.customer.address && <p className="text-white/40 text-xs mt-1">{order.customer.address}</p>}
                        {order.ip && <p className="text-purple-400/60 font-mono text-xs mt-1 flex items-center gap-1"><Shield size={10} />{order.ip}</p>}
                      </div>
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Items</p>
                        {order.items.map((item, i) => (
                          <p key={i} className="text-white/70 text-sm">{item.name} — {item.size} ×{item.quantity}</p>
                        ))}
                        <p className="text-red-400 font-semibold mt-2">Total: CA${order.total.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* AI Full Reasoning */}
                    {order.aiReasoning && (
                      <div className="bg-red-500/10 border border-red-500/20 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot size={12} className="text-red-400" />
                          <p className="text-red-400 text-xs font-semibold uppercase tracking-widest">
                            AI Analysis — {order.aiVerdict} ({order.aiConfidence}% confidence)
                          </p>
                        </div>
                        <p className="text-white/50 text-xs whitespace-pre-wrap leading-relaxed">{order.aiReasoning}</p>
                        {order.aiAnalyzedAt && (
                          <p className="text-white/20 text-[10px] mt-2">
                            Analyzed on {new Date(order.aiAnalyzedAt).toLocaleString('en-US')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Quick actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button onClick={() => blacklist(order)} className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 text-xs font-semibold tracking-widest uppercase transition-colors">
                        <Ban size={11} /> Blacklist customer + IP
                      </button>
                      {order.ip && (
                        <button onClick={() => blockIP(order.ip!, order.orderNumber)} className="flex items-center gap-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-4 py-2 text-xs font-semibold tracking-widest uppercase transition-colors">
                          <Shield size={11} /> Block IP only
                        </button>
                      )}
                      <button onClick={() => clearFlag(order._id)} className="flex items-center gap-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-2 text-xs font-semibold tracking-widest uppercase transition-colors">
                        <ShieldCheck size={11} /> Mark trusted — remove from risks
                      </button>
                      <button onClick={async () => { await clearFlag(order._id); window.location.href = '/admin/orders' }} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/40 px-4 py-2 text-xs font-semibold tracking-widest uppercase transition-colors">
                        <Trash2 size={11} /> Dismiss
                      </button>
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
