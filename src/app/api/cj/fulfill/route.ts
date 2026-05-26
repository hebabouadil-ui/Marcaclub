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

  const { orderId } = await req.json()
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  await connectDB()

  const order = await Order.findById(orderId)
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (order.cjOrderId) {
    return NextResponse.json({ error: 'Already fulfilled with CJ', cjOrderId: order.cjOrderId }, { status: 400 })
  }

  // Build CJ products list — look up cjVid from each product's size entry
  const cjProducts: { vid: string; variantSku?: string; quantity: number }[] = []

  for (const item of order.items as Array<{ productId: string; size: string; quantity: number; name: string }>) {
    const product = await Product.findById(item.productId).lean() as {
      cjPid?: string
      sizes: Array<{ size: string; cjVid?: string; cjSku?: string }>
    } | null

    if (!product?.cjPid) continue  // skip non-CJ products

    const sizeEntry = product.sizes?.find((s) => s.size === item.size)
    const vid = sizeEntry?.cjVid || ''
    const variantSku = sizeEntry?.cjSku || ''

    if (!vid && !variantSku) {
      return NextResponse.json({
        error: `Product "${item.name}" has no CJ variant ID. Re-import it from CJ to fix.`
      }, { status: 400 })
    }

    cjProducts.push({ vid, variantSku, quantity: item.quantity })
  }

  if (cjProducts.length === 0) {
    return NextResponse.json({ error: 'No CJ products found in this order — check products have CJ variants' }, { status: 400 })
  }

  // Split full name into first/last
  const nameParts = order.customer.name.trim().split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || firstName

  try {
    const result = await createCJOrder({
      orderNumber: order.orderNumber,
      shippingAddress: {
        firstName,
        lastName,
        phone: order.customer.phone,
        email: order.customer.email || 'noreply@marca-club.com',
        country: order.customer.country || 'MA',
        province: order.customer.state || order.customer.city,
        city: order.customer.city,
        address: order.customer.address,
        zip: order.customer.postalCode || '00000',
      },
      products: cjProducts,
    })

    if (!result.result) {
      console.error('CJ order error:', result)
      return NextResponse.json({ error: result.message || 'CJ order creation failed' }, { status: 502 })
    }

    const cjOrderId = result.data?.orderId ?? result.data?.cjOrderId ?? String(result.data)
    order.cjOrderId = cjOrderId
    await order.save()

    return NextResponse.json({ success: true, cjOrderId })
  } catch (err) {
    console.error('CJ fulfill error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
