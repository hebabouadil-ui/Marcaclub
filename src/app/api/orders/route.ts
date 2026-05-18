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
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()

    // Validate stock before creating order
    if (Array.isArray(body.items)) {
      for (const item of body.items as { productId: string; size: string; quantity: number; name: string }[]) {
        const product = await Product.findById(item.productId).lean() as { sizes: { size: string; stock: number }[] } | null
        if (!product) return NextResponse.json({ message: `Produit introuvable` }, { status: 400 })
        const entry = product.sizes.find((s) => s.size === item.size)
        if (!entry || entry.stock < item.quantity) {
          return NextResponse.json(
            { message: `Stock insuffisant pour ${item.name} taille ${item.size}` },
            { status: 400 }
          )
        }
      }
    }

    const orderNumber = generateOrderNumber()
    const order = await Order.create({ ...body, orderNumber })

    // Decrement per-size stock for each ordered item
    if (Array.isArray(body.items)) {
      for (const item of body.items as { productId: string; size: string; quantity: number }[]) {
        const product = await Product.findById(item.productId)
        if (!product) continue
        const entry = product.sizes.find((s: { size: string; stock: number }) => s.size === item.size)
        if (entry) entry.stock = Math.max(0, entry.stock - item.quantity)
        product.stock = product.sizes.reduce((sum: number, s: { size: string; stock: number }) => sum + s.stock, 0)
        await product.save()
      }
    }

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
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}
