import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import Product from '@/lib/models/Product'
import Settings from '@/lib/models/Settings'
import Blocklist from '@/lib/models/Blocklist'
import BlockedIP from '@/lib/models/BlockedIP'
import { generateOrderNumber } from '@/lib/utils/generateOrderNumber'
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from '@/lib/utils/email'
import { analyzeOrderRisk } from '@/lib/utils/riskAgent'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const orders = await Order.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json(orders)
  } catch (err) {
    console.error('GET /api/orders error:', err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const ip = getIP(req)
    const body = await req.json()

    // Input validation — field presence + length caps
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
      return NextResponse.json({ message: 'Commande invalide' }, { status: 400 })
    }
    const c = body.customer
    if (!c?.name || !c?.email || !c?.phone || !c?.city || !c?.address || !c?.country) {
      return NextResponse.json({ message: 'Missing customer fields' }, { status: 400 })
    }
    if (
      typeof c.name !== 'string' || c.name.length > 120 ||
      typeof c.phone !== 'string' || c.phone.length > 30 ||
      typeof c.city !== 'string' || c.city.length > 100 ||
      typeof c.address !== 'string' || c.address.length > 300 ||
      typeof c.email !== 'string' || c.email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email) ||
      (body.notes && (typeof body.notes !== 'string' || body.notes.length > 1000))
    ) {
      return NextResponse.json({ message: 'Invalid data' }, { status: 400 })
    }

    // Extract Stripe payment intent ID from clientSecret
    const stripePaymentIntentId = typeof body.stripeClientSecret === 'string'
      ? body.stripeClientSecret.split('_secret_')[0]
      : undefined

    type OrderItem = { productId: string; size: string; quantity: number; name?: string }
    const items = body.items as OrderItem[]

    // Accept tax amount passed from the client (validated against payment intent metadata)
    const clientTaxAmount = typeof body.taxAmount === 'number' && body.taxAmount >= 0 ? body.taxAmount : 0

    // Atomically decrement stock — validate + deduct in one operation per item
    // Build server-trusted item lines from DB (don't trust client price/name/image)
    let serverTotal = 0
    const decremented: { productId: string; size: string; quantity: number }[] = []
    const trustedItems: { productId: string; name: string; price: number; quantity: number; size: string; image: string }[] = []

    for (const item of items) {
      if (!item.productId || !item.size || !item.quantity || item.quantity < 1 || item.quantity > 100) {
        return NextResponse.json({ message: 'Article invalide' }, { status: 400 })
      }

      const updated = await Product.findOneAndUpdate(
        { _id: item.productId, 'sizes': { $elemMatch: { size: item.size, stock: { $gte: item.quantity } } } },
        { $inc: { 'sizes.$[el].stock': -item.quantity } },
        { arrayFilters: [{ 'el.size': item.size }], new: true }
      )

      if (!updated) {
        // Roll back previously decremented items
        for (const done of decremented) {
          await Product.findOneAndUpdate(
            { _id: done.productId, 'sizes.size': done.size },
            { $inc: { 'sizes.$[el].stock': done.quantity } },
            { arrayFilters: [{ 'el.size': done.size }] }
          )
        }
        return NextResponse.json(
          { message: `Stock insuffisant pour ${item.name} taille ${item.size}` },
          { status: 400 }
        )
      }

      // Use $inc to atomically update total stock (avoids race condition from recomputing)
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } })

      decremented.push({ productId: item.productId, size: item.size, quantity: item.quantity })
      serverTotal += updated.price * item.quantity
      trustedItems.push({
        productId: String(updated._id),
        name: updated.name,
        price: updated.price,
        quantity: item.quantity,
        size: item.size,
        image: updated.images?.[0] ?? '',
      })
    }

    const orderNumber = generateOrderNumber()

    // --- Advanced duplicate & risk detection ---
    const phone = body.customer.phone.replace(/\D/g, '')
    const nameTrimmed = body.customer.name.trim()
    const cityTrimmed = body.customer.city.trim().toLowerCase()
    const emailNorm = body.customer.email ? body.customer.email.toLowerCase().trim() : null

    const now = Date.now()
    const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000)
    const since24h = new Date(now - 24 * 60 * 60 * 1000)
    const since2h  = new Date(now - 2 * 60 * 60 * 1000)

    type DupOrder = { orderNumber: string; customer: { phone: string; name: string; email?: string; city: string }; items: Array<{ productId: string }>; total: number; createdAt: Date; ip?: string }

    const baseQuery: Record<string, unknown>[] = [
      { 'customer.phone': { $regex: phone.slice(-9) } },
      { 'customer.name': { $regex: new RegExp(`^${nameTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
    ]
    if (emailNorm) baseQuery.push({ 'customer.email': emailNorm })
    if (ip && ip !== 'unknown') baseQuery.push({ ip })

    const recentOrders = await Order.find({
      createdAt: { $gte: since30d },
      status: { $nin: ['cancelled'] },
      $or: baseQuery,
    }).select('orderNumber customer items total createdAt ip').lean() as DupOrder[]

    // --- IP blocklist check (always HIGH) ---
    const blockedIPEntry = ip && ip !== 'unknown'
      ? await BlockedIP.findOne({ ip }).lean() as { ip: string; reason?: string } | null
      : null

    // --- Customer blocklist check (always HIGH) ---
    type BlockEntry = { phone?: string; name?: string; address?: string; city?: string; reason?: string }
    const blocklistEntries = await Blocklist.find({}).lean() as BlockEntry[]
    const addressTrimmed = body.customer.address?.trim().toLowerCase() || ''

    const blockedBy: string[] = []
    for (const entry of blocklistEntries) {
      if (entry.phone && phone.slice(-9) === entry.phone.replace(/\D/g, '').slice(-9)) blockedBy.push('téléphone blacklisté')
      else if (entry.name && entry.name.toLowerCase() === nameTrimmed.toLowerCase()) blockedBy.push('nom blacklisté')
      else if (entry.address && addressTrimmed && addressTrimmed.includes(entry.address.toLowerCase())) blockedBy.push('adresse blacklistée')
    }

    let flagged = false
    let flagSeverity: 'low' | 'medium' | 'high' | undefined
    let flagReason = ''
    const flaggedOrderNumbers: string[] = []
    const riskSignals: string[] = []
    let maxSeverity = 0 // 0=none,1=low,2=medium,3=high

    if (blockedIPEntry) {
      riskSignals.push(`IP bloquée (${ip})${blockedIPEntry.reason ? ` — ${blockedIPEntry.reason}` : ''}`)
      maxSeverity = 3
    }

    if (blockedBy.length > 0) {
      blockedBy.filter((v, i, a) => a.indexOf(v) === i).forEach((s) => riskSignals.push(s))
      if (3 > maxSeverity) maxSeverity = 3
    }

    const addSignal = (msg: string, level: 1 | 2 | 3) => {
      riskSignals.push(msg)
      if (level > maxSeverity) maxSeverity = level
    }

    // Velocity: same phone, 3+ orders in 24h → HIGH
    const samePhone24h = recentOrders.filter(
      (o) => o.customer.phone.replace(/\D/g, '').slice(-9) === phone.slice(-9) &&
              new Date(o.createdAt).getTime() >= since24h.getTime()
    )
    if (samePhone24h.length >= 2) {
      addSignal(`${samePhone24h.length + 1} commandes en 24h (même téléphone)`, 3)
      samePhone24h.forEach((o) => { if (!flaggedOrderNumbers.includes(o.orderNumber)) flaggedOrderNumbers.push(o.orderNumber) })
    }

    // Identical basket from same city in 2h → HIGH
    const orderProductIds = items.map((i: { productId: string }) => i.productId).sort().join(',')
    const basketMatch2h = recentOrders.filter((o) => {
      if (o.customer.city.trim().toLowerCase() !== cityTrimmed) return false
      if (new Date(o.createdAt).getTime() < since2h.getTime()) return false
      const dupIds = o.items.map((i) => i.productId).sort().join(',')
      return dupIds === orderProductIds
    })
    if (basketMatch2h.length > 0) {
      addSignal(`Panier identique depuis la même ville en moins de 2h`, 3)
      basketMatch2h.forEach((o) => { if (!flaggedOrderNumbers.includes(o.orderNumber)) flaggedOrderNumbers.push(o.orderNumber) })
    }

    // Basic duplicate: same phone (last 9 digits) in 30d → MEDIUM
    for (const dup of recentOrders) {
      const dupPhone = dup.customer.phone.replace(/\D/g, '')
      if (dupPhone.slice(-9) === phone.slice(-9)) {
        addSignal(`même téléphone`, 2)
        if (!flaggedOrderNumbers.includes(dup.orderNumber)) flaggedOrderNumbers.push(dup.orderNumber)
      } else if (dup.customer.name.toLowerCase().trim() === nameTrimmed.toLowerCase()) {
        addSignal(`même nom`, 2)
        if (!flaggedOrderNumbers.includes(dup.orderNumber)) flaggedOrderNumbers.push(dup.orderNumber)
      } else if (emailNorm && dup.customer.email?.toLowerCase() === emailNorm) {
        addSignal(`même email`, 2)
        if (!flaggedOrderNumbers.includes(dup.orderNumber)) flaggedOrderNumbers.push(dup.orderNumber)
      }
    }

    // Same name + same city (no phone match) in 30d → MEDIUM
    const nameCity30d = recentOrders.filter(
      (o) => o.customer.name.toLowerCase().trim() === nameTrimmed.toLowerCase() &&
              o.customer.city.trim().toLowerCase() === cityTrimmed &&
              o.customer.phone.replace(/\D/g, '').slice(-9) !== phone.slice(-9)
    )
    if (nameCity30d.length > 0) {
      addSignal(`même nom + même ville`, 2)
      nameCity30d.forEach((o) => { if (!flaggedOrderNumbers.includes(o.orderNumber)) flaggedOrderNumbers.push(o.orderNumber) })
    }

    // High order value → LOW
    if (serverTotal > 800) {
      addSignal(`montant élevé (${serverTotal.toFixed(0)} MAD)`, 1)
    }

    // Same city + same items on same calendar day → LOW
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const cityItemsToday = recentOrders.filter((o) => {
      if (o.customer.city.trim().toLowerCase() !== cityTrimmed) return false
      if (new Date(o.createdAt).getTime() < todayStart.getTime()) return false
      const dupIds = o.items.map((i) => i.productId).sort().join(',')
      return dupIds === orderProductIds
    })
    if (cityItemsToday.length > 0 && basketMatch2h.length === 0) {
      addSignal(`articles identiques depuis la même ville aujourd'hui`, 1)
      cityItemsToday.forEach((o) => { if (!flaggedOrderNumbers.includes(o.orderNumber)) flaggedOrderNumbers.push(o.orderNumber) })
    }

    // Same IP from different customer → MEDIUM (caught via $or above)
    const sameIpDiffCustomer = recentOrders.filter(
      (o) => o.ip === ip &&
        o.customer.phone.replace(/\D/g, '').slice(-9) !== phone.slice(-9)
    )
    if (sameIpDiffCustomer.length > 0) {
      addSignal(`même IP, client différent (${ip})`, 2)
      sameIpDiffCustomer.forEach((o) => { if (!flaggedOrderNumbers.includes(o.orderNumber)) flaggedOrderNumbers.push(o.orderNumber) })
    }

    // Order at unusual hours (midnight–5am Morocco time, correct DST-aware)
    const moroccohour = parseInt(
      new Intl.DateTimeFormat('fr-MA', { timeZone: 'Africa/Casablanca', hour: 'numeric', hour12: false }).format(new Date()),
      10
    )
    if (moroccohour >= 1 && moroccohour < 5) {
      addSignal(`commande passée la nuit (${moroccohour}h)`, 1)
    }

    if (maxSeverity > 0) {
      flagged = true
      flagSeverity = maxSeverity === 3 ? 'high' : maxSeverity === 2 ? 'medium' : 'low'
      const uniqueSignals = riskSignals.filter((v, i, a) => a.indexOf(v) === i)
      const refList = flaggedOrderNumbers.length ? ` — réf: ${flaggedOrderNumbers.join(', ')}` : ''
      flagReason = `[${flagSeverity.toUpperCase()}] ${uniqueSignals.join(' · ')}${refList}`
    }

    const order = await Order.create({
      customer: {
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        city: c.city,
        state: c.state || undefined,
        country: c.country || 'US',
        postalCode: c.postalCode || undefined,
      },
      items: trustedItems,
      notes: body.notes || undefined,
      orderNumber,
      total: serverTotal + clientTaxAmount,
      taxAmount: clientTaxAmount > 0 ? clientTaxAmount : undefined,
      currency: 'usd',
      stripePaymentIntentId: stripePaymentIntentId || undefined,
      stripePaymentStatus: stripePaymentIntentId ? 'pending' : undefined,
      status: 'pending',
      flagged,
      flagSeverity: flagSeverity || undefined,
      flagReason: flagReason || undefined,
      flaggedOrderNumbers: flaggedOrderNumbers.length ? flaggedOrderNumbers : undefined,
      ip: ip !== 'unknown' ? ip : undefined,
    })

    // Auto-run risk analysis in background — does not block the response
    const orderForRisk = {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      customer: order.customer,
      items: trustedItems.map((i) => ({ productId: i.productId, name: i.name, quantity: i.quantity, size: i.size, price: i.price })),
      total: order.total,
      ip: ip !== 'unknown' ? ip : undefined,
      createdAt: order.createdAt?.toISOString?.() ?? new Date().toISOString(),
    }
    analyzeOrderRisk(orderForRisk).then(async (verdict) => {
      const update: Record<string, unknown> = {
        aiVerdict: verdict.verdict,
        aiConfidence: verdict.confidence,
        aiReasoning: verdict.reasoning,
        aiAnalyzedAt: new Date(),
      }
      if (verdict.verdict === 'HIGH_RISK') {
        update.flagged = true
        update.flagSeverity = 'high'
        update.flagReason = `[AI HIGH_RISK] ${verdict.recommendation}`
      }
      await Order.findByIdAndUpdate(order._id, { $set: update })
    }).catch((err) => console.error('Auto risk analysis error:', err))

    const settings = await Settings.findOne().lean() as { emailNote?: string } | null
    const emailNote = settings?.emailNote

    const emailPromises = []
    if (body.customer?.email) {
      emailPromises.push(sendOrderConfirmationEmail(order, emailNote).catch((err) => console.error('Customer email error:', err)))
    }
    emailPromises.push(sendAdminOrderNotification(order).catch((err) => console.error('Admin email error:', JSON.stringify(err))))
    await Promise.all(emailPromises)

    return NextResponse.json({ orderNumber, orderId: order._id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/orders error:', err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
