import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { createCJOrder } from '@/lib/utils/cjApi'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import Product from '@/lib/models/Product'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { orderId } = await req.json()
    await connectDB()

    const order = await Order.findById(orderId)
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.cjOrderId) return NextResponse.json({ error: 'Already forwarded to CJ' }, { status: 400 })

    // Build CJ product list from order items (only CJ products)
    const cjProducts: { vid: string; quantity: number }[] = []
    for (const item of order.items) {
      const product = await Product.findById(item.productId).lean() as {
        cjPid?: string
        sizes?: Array<{ size: string; cjVid?: string }>
      } | null
      if (!product?.cjPid) continue
      const sizeEntry = product.sizes?.find((s) => s.size === item.size)
      if (!sizeEntry?.cjVid) continue
      cjProducts.push({ vid: sizeEntry.cjVid, quantity: item.quantity })
    }

    if (cjProducts.length === 0) {
      return NextResponse.json({ error: 'No CJ products in this order' }, { status: 400 })
    }

    const nameParts = order.customer.name.trim().split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || firstName

    const cjRes = await createCJOrder({
      orderNumber: order.orderNumber,
      shippingAddress: {
        firstName,
        lastName,
        phone: order.customer.phone,
        email: order.customer.email ?? '',
        country: order.customer.country ?? 'US',
        province: order.customer.state ?? '',
        city: order.customer.city,
        address: order.customer.address,
        zip: order.customer.postalCode ?? '',
      },
      products: cjProducts,
    })

    if (!cjRes.result) {
      return NextResponse.json({ error: `CJ error: ${cjRes.message}` }, { status: 400 })
    }

    await Order.findByIdAndUpdate(orderId, {
      cjOrderId: cjRes.data?.orderId,
      status: 'confirmed',
    })

    return NextResponse.json({ success: true, cjOrderId: cjRes.data?.orderId })
  } catch (err) {
    console.error('CJ order forward error:', err)
    return NextResponse.json({ error: 'Failed to forward order to CJ' }, { status: 500 })
  }
}
