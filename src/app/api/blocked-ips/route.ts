import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import BlockedIP from '@/lib/models/BlockedIP'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/

async function auth() {
  const session = await getServerSession(authOptions)
  return session
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    await connectDB()
    const list = await BlockedIP.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json(list)
  } catch (err) {
    console.error('GET /api/blocked-ips error:', err)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    await connectDB()
    const { ip, reason, orderNumbers } = await req.json()
    if (!ip || typeof ip !== 'string' || !IP_REGEX.test(ip.trim()))
      return NextResponse.json({ message: 'Adresse IP invalide' }, { status: 400 })
    const entry = await BlockedIP.findOneAndUpdate(
      { ip: ip.trim() },
      { $set: { reason: typeof reason === 'string' ? reason.slice(0, 300) : '' }, $addToSet: { orderNumbers: { $each: Array.isArray(orderNumbers) ? orderNumbers : [] } } },
      { upsert: true, new: true }
    )
    return NextResponse.json(entry)
  } catch (err) {
    console.error('POST /api/blocked-ips error:', err)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    await connectDB()
    const { ip } = await req.json()
    if (!ip || typeof ip !== 'string') return NextResponse.json({ message: 'IP requise' }, { status: 400 })
    await BlockedIP.deleteOne({ ip: ip.trim() })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/blocked-ips error:', err)
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 })
  }
}
