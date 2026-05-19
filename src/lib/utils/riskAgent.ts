import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import Blocklist from '@/lib/models/Blocklist'
import BlockedIP from '@/lib/models/BlockedIP'

export interface RiskVerdict {
  verdict: 'SAFE' | 'SUSPICIOUS' | 'HIGH_RISK'
  confidence: number
  reasoning: string
  signals: string[]
  recommendation: string
}

interface OrderContext {
  orderId: string
  orderNumber: string
  customer: { name: string; phone: string; city: string; address: string; email?: string }
  items: Array<{ name: string; quantity: number; size: string; price: number }>
  total: number
  ip?: string
  createdAt: string
}

interface ScoredSignal {
  message: string
  points: number   // positive = risky, negative = trust-building
  severity: 'critical' | 'high' | 'medium' | 'low' | 'positive'
}

export async function analyzeOrderRisk(order: OrderContext): Promise<RiskVerdict> {
  await connectDB()

  const signals: ScoredSignal[] = []
  const phone = order.customer.phone.replace(/\D/g, '').slice(-9)
  const nameTrimmed = order.customer.name.trim().toLowerCase()
  const cityTrimmed = order.customer.city.trim().toLowerCase()
  const now = Date.now()
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000)
  const since7d  = new Date(now - 7  * 24 * 60 * 60 * 1000)
  const since24h = new Date(now - 24 * 60 * 60 * 1000)
  const since2h  = new Date(now - 2  * 60 * 60 * 1000)

  type PastOrder = {
    orderNumber: string
    status: string
    total: number
    createdAt: Date
    ip?: string
    customer: { name: string; phone: string; city: string }
    items: Array<{ productId: string }>
  }

  // ── 1. IP blocklist ────────────────────────────────────────────────────────
  if (order.ip && order.ip !== 'unknown') {
    type BIP = { ip: string; reason?: string }
    const blockedIp = await BlockedIP.findOne({ ip: order.ip }).lean() as BIP | null
    if (blockedIp) {
      signals.push({ message: `IP ${order.ip} est bloquée${blockedIp.reason ? ` (${blockedIp.reason})` : ''}`, points: 80, severity: 'critical' })
    }
  }

  // ── 2. Customer blocklist ──────────────────────────────────────────────────
  type BEntry = { phone?: string; name?: string; address?: string; reason?: string }
  const blocklistEntries = await Blocklist.find({}).lean() as BEntry[]
  const addressLow = order.customer.address.toLowerCase()
  for (const e of blocklistEntries) {
    if (e.phone && e.phone.replace(/\D/g, '').slice(-9) === phone) {
      signals.push({ message: `Téléphone blacklisté${e.reason ? ` — ${e.reason}` : ''}`, points: 80, severity: 'critical' })
      break
    }
    if (e.name && e.name.toLowerCase() === nameTrimmed) {
      signals.push({ message: `Nom blacklisté${e.reason ? ` — ${e.reason}` : ''}`, points: 70, severity: 'critical' })
      break
    }
    if (e.address && addressLow.includes(e.address.toLowerCase())) {
      signals.push({ message: `Adresse blacklistée${e.reason ? ` — ${e.reason}` : ''}`, points: 60, severity: 'critical' })
      break
    }
  }

  // ── 3. Load past orders (same phone OR same IP) ────────────────────────────
  const orQuery: Record<string, unknown>[] = [{ 'customer.phone': { $regex: phone } }]
  if (order.ip && order.ip !== 'unknown') orQuery.push({ ip: order.ip })

  const pastOrders = await Order.find({
    createdAt: { $gte: since30d },
    status: { $nin: ['cancelled'] },
    $or: orQuery,
  }).select('orderNumber status total createdAt ip customer items').lean() as PastOrder[]

  const allPastOrders = await Order.find({
    'customer.phone': { $regex: phone },
  }).select('status').lean() as { status: string }[]

  // ── 4. Customer history trust score ───────────────────────────────────────
  const totalEver = allPastOrders.length
  const deliveredEver = allPastOrders.filter((o) => o.status === 'delivered').length
  const cancelledEver = allPastOrders.filter((o) => o.status === 'cancelled').length

  if (totalEver >= 3 && deliveredEver / totalEver >= 0.75) {
    signals.push({ message: `Client fidèle — ${deliveredEver}/${totalEver} commandes livrées (${Math.round(deliveredEver/totalEver*100)}%)`, points: -30, severity: 'positive' })
  }
  if (totalEver >= 2 && cancelledEver / totalEver >= 0.5) {
    signals.push({ message: `Taux d'annulation élevé — ${cancelledEver}/${totalEver} annulations`, points: 35, severity: 'high' })
  }
  if (totalEver === 0) {
    signals.push({ message: 'Nouveau client — aucun historique', points: 10, severity: 'low' })
  }

  // ── 5. Velocity — orders in last 24h ──────────────────────────────────────
  const last24h = pastOrders.filter((o) => new Date(o.createdAt).getTime() >= since24h.getTime())
  if (last24h.length >= 3) {
    signals.push({ message: `${last24h.length + 1} commandes en moins de 24h (même téléphone)`, points: 60, severity: 'critical' })
  } else if (last24h.length === 2) {
    signals.push({ message: `3 commandes en 24h — activité inhabituelle`, points: 35, severity: 'high' })
  } else if (last24h.length === 1) {
    signals.push({ message: `2 commandes aujourd'hui`, points: 15, severity: 'medium' })
  }

  // ── 6. IP multi-identity fraud ────────────────────────────────────────────
  if (order.ip && order.ip !== 'unknown') {
    const ipOrders = pastOrders.filter((o) => o.ip === order.ip)
    if (ipOrders.length > 0) {
      const uniquePhones = new Set(ipOrders.map((o) => o.customer.phone.replace(/\D/g, '').slice(-9)))
      uniquePhones.delete(phone)
      if (uniquePhones.size >= 2) {
        signals.push({ message: `IP ${order.ip} utilisée par ${uniquePhones.size + 1} numéros différents — fraude probable`, points: 70, severity: 'critical' })
      } else if (uniquePhones.size === 1) {
        signals.push({ message: `IP déjà utilisée avec un autre numéro de téléphone`, points: 40, severity: 'high' })
      } else {
        signals.push({ message: `IP déjà utilisée par ce client — ${ipOrders.length} commande(s) précédente(s)`, points: 15, severity: 'medium' })
      }
    }
  }

  // ── 7. Identical basket duplicate ─────────────────────────────────────────
  const orderProductIds = order.items.map((i) => i as unknown as { productId: string }).map((i) => i.productId).sort().join(',')
  const basketMatch2h = pastOrders.filter((o) => {
    if (new Date(o.createdAt).getTime() < since2h.getTime()) return false
    const ids = o.items.map((i) => i.productId).sort().join(',')
    return ids === orderProductIds && o.customer.city.toLowerCase() === cityTrimmed
  })
  if (basketMatch2h.length > 0) {
    signals.push({ message: `Panier identique passé depuis la même ville en moins de 2h`, points: 55, severity: 'critical' })
  }

  // ── 8. Same name + different phone in same city ───────────────────────────
  const nameCityDiffPhone = await Order.find({
    createdAt: { $gte: since7d },
    'customer.city': { $regex: new RegExp(order.customer.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    'customer.name': { $regex: new RegExp(`^${order.customer.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    'customer.phone': { $not: { $regex: phone } },
    status: { $nin: ['cancelled'] },
  }).countDocuments()
  if (nameCityDiffPhone > 0) {
    signals.push({ message: `Même nom + même ville avec un numéro différent (${nameCityDiffPhone} fois en 7j)`, points: 35, severity: 'high' })
  }

  // ── 9. City-level anomaly ─────────────────────────────────────────────────
  const cityRecent = await Order.find({
    'customer.city': { $regex: new RegExp(order.customer.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    createdAt: { $gte: since24h },
    status: { $nin: ['cancelled'] },
  }).countDocuments()
  if (cityRecent >= 10) {
    signals.push({ message: `Pic de commandes depuis ${order.customer.city} — ${cityRecent} en 24h`, points: 20, severity: 'medium' })
  }

  // ── 10. Order value risk ──────────────────────────────────────────────────
  if (order.total > 1500) {
    signals.push({ message: `Montant très élevé — ${order.total} MAD`, points: 25, severity: 'high' })
  } else if (order.total > 800) {
    signals.push({ message: `Montant élevé — ${order.total} MAD`, points: 10, severity: 'low' })
  } else if (order.total < 150) {
    signals.push({ message: `Petite commande — ${order.total} MAD`, points: -5, severity: 'positive' })
  }

  // ── 11. Night order ───────────────────────────────────────────────────────
  const hour = (new Date().getUTCHours() + 1) % 24
  if (hour >= 1 && hour < 5) {
    signals.push({ message: `Commande passée à ${hour}h du matin`, points: 15, severity: 'medium' })
  }

  // ── 12. Quantity abuse ────────────────────────────────────────────────────
  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0)
  if (totalQty >= 15) {
    signals.push({ message: `Quantité très élevée — ${totalQty} articles`, points: 30, severity: 'high' })
  } else if (totalQty >= 8) {
    signals.push({ message: `Commande en gros — ${totalQty} articles`, points: 15, severity: 'medium' })
  }

  // ── 13. Verified delivery history (trust) ─────────────────────────────────
  if (deliveredEver >= 5) {
    signals.push({ message: `Client vérifié — ${deliveredEver} livraisons réussies`, points: -25, severity: 'positive' })
  }

  // ── Compute final score ───────────────────────────────────────────────────
  const rawScore = signals.reduce((s, sig) => s + sig.points, 0)
  const score = Math.max(0, Math.min(100, rawScore))

  let verdict: RiskVerdict['verdict']
  let confidence: number
  let recommendation: string

  if (score >= 60) {
    verdict = 'HIGH_RISK'
    confidence = Math.min(95, 60 + score / 5)
    recommendation = 'Ne pas livrer sans vérification téléphonique approfondie'
  } else if (score >= 25) {
    verdict = 'SUSPICIOUS'
    confidence = Math.min(90, 50 + score)
    recommendation = 'Appeler le client pour confirmer avant expédition'
  } else {
    verdict = 'SAFE'
    confidence = Math.max(60, 95 - score * 2)
    recommendation = 'Procéder à la livraison normalement'
  }

  // ── Build reasoning text ──────────────────────────────────────────────────
  const critical = signals.filter((s) => s.severity === 'critical')
  const highs    = signals.filter((s) => s.severity === 'high')
  const mediums  = signals.filter((s) => s.severity === 'medium')
  const lows     = signals.filter((s) => s.severity === 'low')
  const positives= signals.filter((s) => s.severity === 'positive')

  const lines: string[] = [
    `Analyse de risque — Commande ${order.orderNumber}`,
    `Score de risque: ${score}/100 → Verdict: ${verdict} (${Math.round(confidence)}% de confiance)`,
    '',
  ]

  if (critical.length)  { lines.push('🔴 Signaux critiques:'); critical.forEach((s) => lines.push(`  • ${s.message} (+${s.points} pts)`)) }
  if (highs.length)     { lines.push('🟠 Signaux élevés:');    highs.forEach((s) => lines.push(`  • ${s.message} (+${s.points} pts)`)) }
  if (mediums.length)   { lines.push('🟡 Signaux modérés:');   mediums.forEach((s) => lines.push(`  • ${s.message} (+${s.points} pts)`)) }
  if (lows.length)      { lines.push('⚪ Signaux faibles:');   lows.forEach((s) => lines.push(`  • ${s.message} (+${s.points} pts)`)) }
  if (positives.length) { lines.push('🟢 Facteurs positifs:'); positives.forEach((s) => lines.push(`  • ${s.message} (${s.points} pts)`)) }

  lines.push('')
  lines.push(`Historique: ${totalEver} commande(s) au total — ${deliveredEver} livrée(s), ${cancelledEver} annulée(s)`)
  lines.push(`Recommandation: ${recommendation}`)

  const signalLabels = [
    ...critical.map((s) => s.message),
    ...highs.map((s) => s.message),
    ...mediums.map((s) => s.message),
    ...positives.map((s) => s.message),
  ].slice(0, 8)

  return {
    verdict,
    confidence: Math.round(confidence),
    reasoning: lines.join('\n'),
    signals: signalLabels,
    recommendation,
  }
}
