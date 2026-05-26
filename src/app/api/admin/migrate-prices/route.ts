// One-time migration: convert all product prices from MAD to CAD
// MAD prices are typically > 30 (smallest would be ~25 MAD for a $2.49 USD product)
// CAD prices after migration would be price * (1.38/10.05) ≈ price * 0.137
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'

export const dynamic = 'force-dynamic'
const MAD_TO_CAD = 1.38 / 10.05  // ≈ 0.1373

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const products = await Product.find({}).lean()
  let migrated = 0

  for (const p of products) {
    const prod = p as any
    // Only migrate if price looks like MAD (>= 15, since cheapest CAD sell price would be ~$5)
    if (prod.price >= 15) {
      const updates: Record<string, unknown> = {
        price: Math.round(prod.price * MAD_TO_CAD * 100) / 100,
      }
      if (prod.originalPrice && prod.originalPrice >= 15) {
        updates.originalPrice = Math.round(prod.originalPrice * MAD_TO_CAD * 100) / 100
      }
      // Migrate variant prices in sizes array
      if (Array.isArray(prod.sizes)) {
        updates.sizes = prod.sizes.map((s: any) => ({
          ...s,
          variantPrice: s.variantPrice >= 15 ? Math.round(s.variantPrice * MAD_TO_CAD * 100) / 100 : s.variantPrice,
          baseVariantPrice: s.baseVariantPrice >= 15 ? Math.round(s.baseVariantPrice * MAD_TO_CAD * 100) / 100 : s.baseVariantPrice,
        }))
      }
      await Product.updateOne({ _id: prod._id }, { $set: updates })
      migrated++
    }
  }

  return NextResponse.json({ migrated, total: products.length })
}
