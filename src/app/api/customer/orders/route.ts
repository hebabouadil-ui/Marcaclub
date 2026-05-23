import { NextResponse } from 'next/server'
import { getCustomerSession } from '@/lib/utils/customerAuth'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getCustomerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const orders = await Order.find({ 'customer.email': session.email })
    .select('orderNumber total currency status createdAt items customer stripePaymentStatus cjTrackingNumber')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json(orders)
}
