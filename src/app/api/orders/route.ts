import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import Product from '@/lib/models/Product'
import Settings from '@/lib/models/Settings'
import Blocklist from '@/lib/models/Blocklist'
import { generateOrderNumber } from '@/lib/utils/generateOrderNumber'
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from '@/lib/utils/email'
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

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()

    // Basic input validation
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
      return NextResponse.json({ message: 'Commande invalide' }, { status: 400 })
    }
    if (!body.customer?.name || !body.customer?.phone || !body.customer?.city) {
      return NextResponse.json({ message: 'Informations client manquantes' }, { status: 400 })
    }

    type OrderItem = { productId: string; size: string; quantity: number; name: string }
    const items = body.items as OrderItem[]

    // Atomically decrement stock — validate + deduct in one operation per item
    let serverTotal = 0
    const decremented: { productId: string; size: string; quantity: number }[] = []

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

      // Recompute total stock field
      const totalStock = updated.sizes.reduce((s: number, i: { stock: number }) => s + i.stock, 0)
      await Product.findByIdAndUpdate(item.productId, { stock: totalStock })

      decremented.push({ productId: item.productId, size: item.size, quantity: item.quantity })

      // Compute server-side total from actual DB price
      serverTotal += updated.price * item.quantity
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

    type DupOrder = { orderNumber: string; customer: { phone: string; name: string; email?: string; city: string }; items: Array<{ productId: string }>; total: number; createdAt: Date }

    const baseQuery: Record<string, unknown>[] = [
      { 'customer.phone': { $regex: phone.slice(-9) } },
      { 'customer.name': { $regex: new RegExp(`^${nameTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
    ]
    if (emailNorm) baseQuery.push({ 'customer.email': emailNorm })

    const recentOrders = await Order.find({
      createdAt: { $gte: since30d },
      status: { $nin: ['cancelled'] },
      $or: baseQuery,
    }).select('orderNumber customer items total createdAt').lean() as DupOrder[]

    // --- Blocklist check (always HIGH) ---
    type BlockEntry = { phone?: string; name?: string; address?: string; city?: string; reason?: string }
    const blocklistEntries = await Blocklist.find({}).lean() as BlockEntry[]
    const addressTrimmed = body.customer.address?.trim().toLowerCase() || ''

    const blockedBy: string[] = []
    for (const entry of blocklistEntries) {
      if (entry.phone && entry.phone === phone.slice(-entry.phone.length)) blockedBy.push('téléphone blacklisté')
      else if (entry.name && entry.name.toLowerCase() === nameTrimmed.toLowerCase()) blockedBy.push('nom blacklisté')
      else if (entry.address && addressTrimmed && addressTrimmed.includes(entry.address.toLowerCase())) blockedBy.push('adresse blacklistée')
    }

    let flagged = false
    let flagSeverity: 'low' | 'medium' | 'high' | undefined
    let flagReason = ''
    const flaggedOrderNumbers: string[] = []
    const riskSignals: string[] = []
    let maxSeverity = 0 // 0=none,1=low,2=medium,3=high

    if (blockedBy.length > 0) {
      blockedBy.filter((v, i, a) => a.indexOf(v) === i).forEach((s) => riskSignals.push(s))
      maxSeverity = 3
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

    // Order at unusual hours (midnight–5am Morocco time, UTC+1) → LOW
    const moroccohour = (new Date().getUTCHours() + 1) % 24
    if (moroccohour >= 0 && moroccohour < 5) {
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
      customer: body.customer,
      items: body.items,
      notes: body.notes,
      orderNumber,
      total: serverTotal,
      flagged,
      flagSeverity: flagSeverity || undefined,
      flagReason: flagReason || undefined,
      flaggedOrderNumbers: flaggedOrderNumbers.length ? flaggedOrderNumbers : undefined,
    })

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
