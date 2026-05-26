// One-time migration: fix old product prices that were stored in a legacy currency.
// Old prices were in units ~10x larger than CAD. Conversion factor ≈ 0.137.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'

export const dynamic = 'force-dynamic'
const LEGACY_TO_CAD = 1.38 / 10.05  // ≈ 0.1373

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const products = await Product.find({}).lean()
  let migrated = 0

  for (const p of products) {
    const prod = p as any
    // Only convert if price looks like legacy format (>= 15, CAD prices are typically < 10 at minimum)
    if (prod.price >= 15) {
      const updates: Record<string, unknown> = {
        price: Math.round(prod.price * LEGACY_TO_CAD * 100) / 100,
      }
      if (prod.originalPrice && prod.originalPrice >= 15) {
        updates.originalPrice = Math.round(prod.originalPrice * LEGACY_TO_CAD * 100) / 100
      }
      if (Array.isArray(prod.sizes)) {
        updates.sizes = prod.sizes.map((s: any) => ({
          ...s,
          variantPrice: s.variantPrice >= 15 ? Math.round(s.variantPrice * LEGACY_TO_CAD * 100) / 100 : s.variantPrice,
          baseVariantPrice: s.baseVariantPrice >= 15 ? Math.round(s.baseVariantPrice * LEGACY_TO_CAD * 100) / 100 : s.baseVariantPrice,
        }))
      }
      await Product.updateOne({ _id: prod._id }, { $set: updates })
      migrated++
    }
  }

  return NextResponse.json({ migrated, total: products.length })
}
