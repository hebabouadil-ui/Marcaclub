import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import Product from '@/lib/models/Product'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { sendOrderStatusEmail } from '@/lib/utils/email'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const order = await Order.findById(params.id).lean()
    if (!order) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(order)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const body = await req.json()

    // Handle unflag action separately
    if (body.action === 'unflag') {
      const order = await Order.findById(params.id)
      if (!order) return NextResponse.json({ message: 'Not found' }, { status: 404 })
      order.flagged = false
      order.flagReason = undefined
      order.flaggedOrderNumbers = []
      await order.save()
      return NextResponse.json(order.toObject())
    }

    const { status } = body
    const VALID_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ message: 'Statut invalide' }, { status: 400 })
    }
    const order = await Order.findById(params.id)
    if (!order) return NextResponse.json({ message: 'Not found' }, { status: 404 })

    const previousStatus = order.status
    order.status = status
    await order.save()

    // Restore stock when cancelling, re-deduct if un-cancelling (per-size)
    const shouldAdjust =
      (status === 'cancelled' && previousStatus !== 'cancelled') ||
      (previousStatus === 'cancelled' && status !== 'cancelled')

    if (shouldAdjust) {
      for (const item of order.items as unknown as { productId: string; size: string; quantity: number }[]) {
        const product = await Product.findById(item.productId)
        if (!product) continue
        const entry = product.sizes.find((s: { size: string; stock: number }) => s.size === item.size)
        if (entry) {
          entry.stock = status === 'cancelled'
            ? entry.stock + item.quantity
            : Math.max(0, entry.stock - item.quantity)
        }
        product.stock = product.sizes.reduce((sum: number, s: { size: string; stock: number }) => sum + s.stock, 0)
        await product.save()
      }
    }

    const plainOrder = order.toObject()
    await sendOrderStatusEmail(plainOrder, status).catch((err) => console.error('Status email error:', err))
    return NextResponse.json(plainOrder)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
