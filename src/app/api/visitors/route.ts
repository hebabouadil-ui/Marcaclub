import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Visitor from '@/lib/models/Visitor'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'

// Public: heartbeat from a visitor
export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { sessionId, page } = await req.json()
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 64) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    await Visitor.findOneAndUpdate(
      { sessionId },
      { lastSeen: new Date(), page: page || '/' },
      { upsert: true }
    )
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

// Admin only: get active visitor count
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const since = new Date(Date.now() - 2 * 60 * 1000) // active in last 2 minutes
    const count = await Visitor.countDocuments({ lastSeen: { $gte: since } })
    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
