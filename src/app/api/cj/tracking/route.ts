import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { getCJOrderDetail } from '@/lib/utils/cjApi'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orderId = req.nextUrl.searchParams.get('orderId')
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  await connectDB()
  const order = await Order.findById(orderId).lean() as { cjOrderId?: string; cjTrackingNumber?: string } | null
  if (!order?.cjOrderId) return NextResponse.json({ error: 'No CJ order linked' }, { status: 404 })

  try {
    const data = await getCJOrderDetail(order.cjOrderId)
    if (!data.result) return NextResponse.json({ error: data.message || 'CJ error' }, { status: 502 })

    const trackingNumber = data.data?.trackNumber ?? data.data?.trackingNumber ?? null
    const cjStatus = data.data?.orderStatus ?? data.data?.status ?? null
    const trackingUrl = data.data?.trackUrl ?? null

    // Save tracking number if newly available
    if (trackingNumber && !order.cjTrackingNumber) {
      await Order.findByIdAndUpdate(orderId, { cjTrackingNumber: trackingNumber })
    }

    return NextResponse.json({ cjOrderId: order.cjOrderId, trackingNumber, cjStatus, trackingUrl, raw: data.data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
