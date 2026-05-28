import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Blocklist from '@/lib/models/Blocklist'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    await connectDB()
    const entries = await Blocklist.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json(entries)
  } catch (err) {
    console.error('GET /api/blocklist error:', err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    await connectDB()
    const body = await req.json()
    const { phone, name, address, city, reason } = body

    if (!phone && !name && !address) {
      return NextResponse.json({ message: 'Au moins un identifiant requis' }, { status: 400 })
    }

    const entry = await Blocklist.create({
      phone: phone ? phone.replace(/\D/g, '') : undefined,
      name: name ? name.trim() : undefined,
      address: address ? address.trim() : undefined,
      city: city ? city.trim() : undefined,
      reason: reason || undefined,
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (err) {
    console.error('POST /api/blocklist error:', err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    await connectDB()
    const { id } = await req.json()
    if (!id) return NextResponse.json({ message: 'id required' }, { status: 400 })
    await Blocklist.findByIdAndDelete(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/blocklist error:', err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
