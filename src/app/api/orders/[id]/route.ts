import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import Product from '@/lib/models/Product'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { sendOrderStatusEmail } from '@/lib/utils/email'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  if (!mongoose.isValidObjectId(params.id))
    return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

  try {
    await connectDB()
    const order = await Order.findById(params.id).lean()
    if (!order) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(order)
  } catch (err) {
    console.error('GET /api/orders/[id] error:', err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  if (!mongoose.isValidObjectId(params.id))
    return NextResponse.json({ message: 'Invalid id' }, { status: 400 })

  try {
    await connectDB()
    const body = await req.json()

    // Unflag: clear all flag + AI verdict fields
    if (body.action === 'unflag') {
      const order = await Order.findByIdAndUpdate(
        params.id,
        {
          $set: { flagged: false },
          $unset: { flagReason: '', flagSeverity: '', flaggedOrderNumbers: '', aiVerdict: '', aiConfidence: '', aiReasoning: '', aiAnalyzedAt: '' },
        },
        { new: true }
      )
      if (!order) return NextResponse.json({ message: 'Not found' }, { status: 404 })
      return NextResponse.json(order.toObject())
    }

    const { status } = body
    const VALID_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
    if (!VALID_STATUSES.includes(status))
      return NextResponse.json({ message: 'Statut invalide' }, { status: 400 })

    const order = await Order.findById(params.id)
    if (!order) return NextResponse.json({ message: 'Not found' }, { status: 404 })

    const previousStatus = order.status
    order.status = status
    await order.save()

    // Adjust stock atomically when toggling cancelled ↔ active
    const shouldAdjust =
      (status === 'cancelled' && previousStatus !== 'cancelled') ||
      (previousStatus === 'cancelled' && status !== 'cancelled')

    if (shouldAdjust) {
      for (const item of order.items as unknown as { productId: string; size: string; quantity: number }[]) {
        const delta = status === 'cancelled' ? item.quantity : -item.quantity
        await Product.findOneAndUpdate(
          { _id: item.productId, 'sizes.size': item.size },
          {
            $inc: {
              'sizes.$[el].stock': delta,
              stock: delta,
            },
          },
          { arrayFilters: [{ 'el.size': item.size }] }
        )
      }
    }

    const plainOrder = order.toObject()
    sendOrderStatusEmail(plainOrder, status).catch((err) => console.error('Status email error:', err))
    return NextResponse.json(plainOrder)
  } catch (err) {
    console.error('PUT /api/orders/[id] error:', err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
