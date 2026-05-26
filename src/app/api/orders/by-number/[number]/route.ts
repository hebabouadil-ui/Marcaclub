import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'

export const dynamic = 'force-dynamic'

// Public endpoint — returns only safe fields for the receipt page
// Requires ?email= query param matching order email for full PII; otherwise returns stripped data
export async function GET(req: NextRequest, { params }: { params: { number: string } }) {
  try {
    await connectDB()
    const order = await Order.findOne({ orderNumber: params.number })
      .select('orderNumber total taxAmount shippingFee currency currencySymbol status createdAt customer items stripePaymentStatus')
      .lean() as Record<string, unknown> & { customer?: { email?: string } } | null
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const emailParam = new URL(req.url).searchParams.get('email')
    // If order has an email and the caller didn't provide a matching one, strip PII
    if (order.customer?.email && emailParam?.toLowerCase() !== order.customer.email.toLowerCase()) {
      const safe = {
        orderNumber: order.orderNumber,
        total: order.total,
        taxAmount: order.taxAmount,
        shippingFee: order.shippingFee,
        currency: order.currency,
        currencySymbol: order.currencySymbol,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items,
        stripePaymentStatus: order.stripePaymentStatus,
      }
      return NextResponse.json(safe)
    }

    return NextResponse.json(order)
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
