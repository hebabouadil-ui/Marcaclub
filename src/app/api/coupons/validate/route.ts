import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Coupon from '@/lib/models/Coupon'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { code, subtotalCAD, customerEmail } = await req.json()
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Invalid code' }, { status: 400 })
    }

    await connectDB()
    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() }).lean() as {
      _id: unknown
      code: string
      type: 'percent' | 'fixed'
      value: number
      active: boolean
      expiresAt?: Date
      usageLimit?: number
      usageCount: number
      minOrderAmount?: number
      onePerCustomer: boolean
      usedByCustomers: string[]
    } | null

    if (!coupon) return NextResponse.json({ valid: false, error: 'Code invalide' })
    if (!coupon.active) return NextResponse.json({ valid: false, error: 'Ce code est désactivé' })
    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      return NextResponse.json({ valid: false, error: 'Ce code a expiré' })
    }
    if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({ valid: false, error: 'Ce code a atteint sa limite d\'utilisation' })
    }
    if (coupon.minOrderAmount && subtotalCAD < coupon.minOrderAmount) {
      return NextResponse.json({
        valid: false,
        error: `Commande minimum CA$${coupon.minOrderAmount.toFixed(2)} requise`,
      })
    }
    if (coupon.onePerCustomer && customerEmail && coupon.usedByCustomers.includes(customerEmail.toLowerCase())) {
      return NextResponse.json({ valid: false, error: 'Ce code a déjà été utilisé pour votre compte' })
    }

    const discountCAD = coupon.type === 'percent'
      ? Math.round(subtotalCAD * (coupon.value / 100) * 100) / 100
      : Math.min(coupon.value, subtotalCAD)

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discountCAD,
    })
  } catch (err) {
    console.error('coupon validate error', err)
    return NextResponse.json({ valid: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
