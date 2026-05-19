import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import { analyzeOrderRisk } from '@/lib/utils/riskAgent'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const { orderId } = await req.json()
    if (!orderId) return NextResponse.json({ message: 'orderId required' }, { status: 400 })

    const order = await Order.findById(orderId).lean() as {
      _id: string; orderNumber: string; customer: { name: string; phone: string; city: string; address: string; email?: string }
      items: Array<{ name: string; quantity: number; size: string; price: number }>
      total: number; ip?: string; createdAt: Date
    } | null

    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 })

    const verdict = await analyzeOrderRisk({
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      customer: order.customer,
      items: order.items,
      total: order.total,
      ip: order.ip,
      createdAt: order.createdAt.toISOString(),
    })

    // Save verdict to order
    await Order.findByIdAndUpdate(orderId, {
      aiVerdict: verdict.verdict,
      aiConfidence: verdict.confidence,
      aiReasoning: verdict.reasoning,
      aiAnalyzedAt: new Date(),
      // Auto-escalate flag if AI says HIGH_RISK
      ...(verdict.verdict === 'HIGH_RISK' && { flagged: true, flagSeverity: 'high', flagReason: `[AI HIGH_RISK] ${verdict.recommendation}` }),
    })

    return NextResponse.json(verdict)
  } catch (err) {
    console.error('AI risk analysis error:', err)
    return NextResponse.json({ message: 'Analysis failed' }, { status: 500 })
  }
}
