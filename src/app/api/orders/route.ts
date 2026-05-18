import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import Product from '@/lib/models/Product'
import Settings from '@/lib/models/Settings'
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

    // Duplicate detection — check last 30 days for same phone, name, email, or address
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const phone = body.customer.phone.replace(/\D/g, '')
    const duplicateQuery: Record<string, unknown>[] = [
      { 'customer.phone': { $regex: phone.slice(-9) } },
      { 'customer.name': { $regex: new RegExp(`^${body.customer.name.trim()}$`, 'i') } },
    ]
    if (body.customer.email) {
      duplicateQuery.push({ 'customer.email': body.customer.email.toLowerCase().trim() })
    }
    const duplicates = await Order.find({
      createdAt: { $gte: since },
      status: { $nin: ['cancelled'] },
      $or: duplicateQuery,
    }).select('orderNumber customer createdAt').lean()

    let flagged = false
    let flagReason = ''
    const flaggedOrderNumbers: string[] = []

    if (duplicates.length > 0) {
      const reasons: string[] = []
      for (const dup of duplicates as Array<{ orderNumber: string; customer: { phone: string; name: string; email?: string } }>) {
        const dupPhone = dup.customer.phone.replace(/\D/g, '')
        if (dupPhone.slice(-9) === phone.slice(-9)) reasons.push(`même téléphone`)
        else if (dup.customer.name.toLowerCase().trim() === body.customer.name.toLowerCase().trim()) reasons.push(`même nom`)
        else if (body.customer.email && dup.customer.email?.toLowerCase() === body.customer.email.toLowerCase()) reasons.push(`même email`)
        flaggedOrderNumbers.push(dup.orderNumber)
      }
      flagged = true
      flagReason = `Doublon détecté (${reasons.filter((v, i, a) => a.indexOf(v) === i).join(', ')}) avec commande(s) : ${flaggedOrderNumbers.join(', ')}`
    }

    const order = await Order.create({
      customer: body.customer,
      items: body.items,
      notes: body.notes,
      orderNumber,
      total: serverTotal,
      flagged,
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
