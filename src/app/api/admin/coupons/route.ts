import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { connectDB } from '@/lib/db'
import Coupon from '@/lib/models/Coupon'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean()
  return NextResponse.json(coupons)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { code, type, value, active, expiresAt, usageLimit, minOrderAmount, onePerCustomer } = body

    if (!code || !type || value == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!['percent', 'fixed'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
    if (type === 'percent' && (value <= 0 || value > 100)) {
      return NextResponse.json({ error: 'Percent must be 1–100' }, { status: 400 })
    }
    if (type === 'fixed' && value <= 0) {
      return NextResponse.json({ error: 'Fixed amount must be > 0' }, { status: 400 })
    }

    await connectDB()
    const coupon = await Coupon.create({
      code: String(code).toUpperCase().trim(),
      type,
      value: Number(value),
      active: active !== false,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      usageLimit: usageLimit ? Number(usageLimit) : undefined,
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
      onePerCustomer: Boolean(onePerCustomer),
    })
    return NextResponse.json(coupon, { status: 201 })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
      return NextResponse.json({ error: 'Code already exists' }, { status: 409 })
    }
    console.error('POST /api/admin/coupons error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
