import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import { getCJToken } from '@/lib/utils/cjApi'
import { sendOrderStatusEmail } from '@/lib/utils/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1'

async function getCJOrderTracking(cjOrderId: string): Promise<{ trackingNumber?: string; status?: string } | null> {
  try {
    const token = await getCJToken()
    const res = await fetch(`${CJ_BASE}/shopping/order/getOrderDetail?orderId=${cjOrderId}`, {
      headers: { 'CJ-Access-Token': token },
    })
    const data = await res.json()
    if (!data.result || !data.data) return null

    const trackingNumber = data.data.trackNumber || data.data.trackingNumber || null
    const cjStatus = data.data.orderStatus || null

    return { trackingNumber, status: cjStatus }
  } catch {
    return null
  }
}

// Called by Vercel cron — also callable manually by admin
export async function GET(req: NextRequest) {
  // Verify it's from Vercel cron or admin (basic protection)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  // Find orders forwarded to CJ but not yet shipped (no tracking number)
  const orders = await Order.find({
    cjOrderId: { $exists: true, $ne: null },
    cjTrackingNumber: { $exists: false },
    status: { $in: ['confirmed', 'shipped'] },
  }).limit(50)

  let updated = 0
  let emailed = 0

  for (const order of orders) {
    const tracking = await getCJOrderTracking(order.cjOrderId!)
    if (!tracking?.trackingNumber) continue

    const wasShipped = order.status !== 'shipped'

    // Update order with tracking number
    await Order.findByIdAndUpdate(order._id, {
      cjTrackingNumber: tracking.trackingNumber,
      status: 'shipped',
    })

    updated++

    // Email customer if they have an email and order just became shipped
    if (wasShipped && order.customer.email) {
      try {
        const updatedOrder = await Order.findById(order._id)
        if (updatedOrder) {
          await sendOrderStatusEmail(updatedOrder, 'shipped')
          emailed++
        }
      } catch (e) {
        console.error(`Tracking email failed for order ${order.orderNumber}:`, e)
      }
    }
  }

  return NextResponse.json({
    checked: orders.length,
    updated,
    emailed,
    timestamp: new Date().toISOString(),
  })
}
