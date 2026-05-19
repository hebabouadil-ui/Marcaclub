import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ pendingUntouched: 0, highRisk: 0 }, { status: 401 })

  try {
    await connectDB()
    const [pendingUntouched, highRisk] = await Promise.all([
      Order.countDocuments({ status: 'pending', flagged: false, $or: [{ trusted: { $exists: false } }, { trusted: false }] }),
      Order.countDocuments({ trusted: { $ne: true }, $or: [{ flagSeverity: 'high' }, { aiVerdict: 'HIGH_RISK' }] }),
    ])
    return NextResponse.json({ pendingUntouched, highRisk })
  } catch {
    return NextResponse.json({ pendingUntouched: 0, highRisk: 0 })
  }
}
