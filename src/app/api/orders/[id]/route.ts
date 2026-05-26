import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import Product from '@/lib/models/Product'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { sendOrderStatusEmail } from '@/lib/utils/email'
import { createCJOrder } from '@/lib/utils/cjApi'

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

    // Unflag: clear all flag + AI verdict fields, mark as trusted
    if (body.action === 'unflag') {
      const order = await Order.findByIdAndUpdate(
        params.id,
        {
          $set: { flagged: false, trusted: true },
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

    // Auto-fulfill on CJ when confirming for the first time
    if (status === 'confirmed' && previousStatus !== 'confirmed' && !order.cjOrderId) {
      try {
        const productIds = order.items.map((i: { productId: string }) => i.productId)
        const products = await Product.find({ _id: { $in: productIds } }).lean() as Array<{
          _id: mongoose.Types.ObjectId; cjPid?: string; cjLogisticName?: string
          sizes: Array<{ size: string; cjVid?: string; cjSku?: string }>
        }>
        const productMap = new Map(products.map((p) => [String(p._id), p]))

        const cjItems: { vid: string; variantSku?: string; quantity: number }[] = []
        for (const item of order.items as unknown as { productId: string; size: string; quantity: number }[]) {
          const prod = productMap.get(String(item.productId))
          if (!prod?.cjPid) continue
          const sizeEntry = prod.sizes.find((s) => s.size === item.size)
          const vid = (sizeEntry?.cjVid ?? '').trim()
          const variantSku = (sizeEntry?.cjSku ?? '').trim()
          if (!vid && !variantSku) continue
          cjItems.push({ vid, variantSku, quantity: item.quantity })
        }

        if (cjItems.length > 0) {
          const c = order.customer as { name: string; phone: string; address: string; city: string; state?: string; country: string; postalCode?: string; email?: string }
          const nameParts = c.name.trim().split(' ')
          const firstName = nameParts[0]
          const lastName = nameParts.slice(1).join(' ') || '.'
          const firstProduct = products.find((p) => p.cjPid)
          const result = await createCJOrder({
            orderNumber: order.orderNumber,
            shippingAddress: {
              firstName,
              lastName,
              phone: c.phone,
              email: c.email || '',
              country: c.country || 'MA',
              province: c.state || c.city,
              city: c.city,
              address: c.address,
              zip: c.postalCode || '00000',
            },
            products: cjItems,
            logisticName: firstProduct?.cjLogisticName,
          })
          if (result?.data?.orderId) {
            console.log('Auto-fulfill CJ:', result)
            order.cjOrderId = result.data.orderId
            await order.save()
          } else {
            console.error('Auto-fulfill CJ error:', result)
          }
        }
      } catch (fulfillErr) {
        console.error('Auto-fulfill CJ exception:', fulfillErr)
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
