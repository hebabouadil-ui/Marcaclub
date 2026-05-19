import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import BlockedIP from '@/lib/models/BlockedIP'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'

async function auth() {
  const session = await getServerSession(authOptions)
  return session
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const list = await BlockedIP.find({}).sort({ createdAt: -1 }).lean()
  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { ip, reason, orderNumbers } = await req.json()
  if (!ip || typeof ip !== 'string') return NextResponse.json({ message: 'IP requise' }, { status: 400 })
  const entry = await BlockedIP.findOneAndUpdate(
    { ip },
    { $set: { reason: reason || '' }, $addToSet: { orderNumbers: { $each: orderNumbers || [] } } },
    { upsert: true, new: true }
  )
  return NextResponse.json(entry)
}

export async function DELETE(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const { ip } = await req.json()
  await BlockedIP.deleteOne({ ip })
  return NextResponse.json({ ok: true })
}
