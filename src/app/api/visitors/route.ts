import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Visitor from '@/lib/models/Visitor'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

// Public: heartbeat from a visitor
export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { sessionId, page } = await req.json()
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 64) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    // Sanitize page: must be a path string, cap at 200 chars
    const safePage = typeof page === 'string' ? page.slice(0, 200) : '/'
    const ip = getIP(req)
    try {
      await Visitor.findOneAndUpdate(
        { sessionId },
        { lastSeen: new Date(), page: safePage, ip },
        { upsert: true }
      )
    } catch (e: unknown) {
      // E11000 duplicate key on concurrent upsert — harmless, just ignore
      if ((e as { code?: number }).code !== 11000) throw e
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

// Admin only: get active visitors with IP
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const since = new Date(Date.now() - 2 * 60 * 1000)
    const visitors = await Visitor.find({ lastSeen: { $gte: since } })
      .select('ip page lastSeen')
      .lean()
    return NextResponse.json({ count: visitors.length, visitors })
  } catch {
    return NextResponse.json({ count: 0, visitors: [] })
  }
}
