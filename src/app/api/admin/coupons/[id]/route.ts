import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { connectDB } from '@/lib/db'
import Coupon from '@/lib/models/Coupon'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const body = await req.json()
    const allowed = ['active', 'expiresAt', 'usageLimit', 'minOrderAmount', 'value', 'type', 'code', 'onePerCustomer']
    const update: Record<string, unknown> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key]
    }
    if (update.code) update.code = String(update.code).toUpperCase().trim()

    const coupon = await Coupon.findByIdAndUpdate(params.id, { $set: update }, { new: true })
    if (!coupon) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(coupon)
  } catch (err) {
    console.error('PATCH /api/admin/coupons/[id] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    await Coupon.findByIdAndDelete(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/admin/coupons/[id] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
