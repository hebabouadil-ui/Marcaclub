import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import { getCJOrderDetail } from '@/lib/utils/cjApi'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { number: string } }) {
  try {
    await connectDB()
    const order = await Order.findOne({ orderNumber: params.number })
    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    let trackingUrl: string | undefined
    let cjStatus: string | undefined
    let estimatedDays = '7–15 business days'

    if (order.cjOrderId) {
      try {
        const detail = await getCJOrderDetail(order.cjOrderId)
        const d = detail?.data
        if (d) {
          const trackNum = d.trackNumber || d.trackingNumber
          const tUrl = d.trackUrl || d.trackingUrl
          cjStatus = d.orderStatus || d.status
          if (tUrl) trackingUrl = tUrl
          if (trackNum && trackNum !== order.cjTrackingNumber) {
            // Only update tracking number — never overwrite admin-set status from a polling GET
            await Order.findByIdAndUpdate(order._id, { cjTrackingNumber: trackNum })
            order.cjTrackingNumber = trackNum
          }
        }
      } catch (cjErr) {
        console.error('CJ detail fetch error:', cjErr)
      }
    }

    return NextResponse.json({
      orderNumber: order.orderNumber,
      status: order.status,
      cjTrackingNumber: order.cjTrackingNumber ?? null,
      trackingUrl: trackingUrl ?? null,
      estimatedDays,
      cjStatus: cjStatus ?? null,
    })
  } catch (err) {
    console.error('GET /api/orders/by-number/[number]/tracking error:', err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
