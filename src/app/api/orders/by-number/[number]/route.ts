import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'

export const dynamic = 'force-dynamic'

// Public endpoint — returns only safe fields for the receipt page
export async function GET(_: NextRequest, { params }: { params: { number: string } }) {
  try {
    await connectDB()
    const order = await Order.findOne({ orderNumber: params.number })
      .select('orderNumber total taxAmount currency status createdAt customer items stripePaymentStatus')
      .lean()
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(order)
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
