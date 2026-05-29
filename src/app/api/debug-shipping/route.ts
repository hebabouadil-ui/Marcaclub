import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import { getCJShippingInfo } from '@/lib/utils/cjApi'
import { getCadRates } from '@/lib/utils/getRates'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { productId, size, quantity, country } = await req.json()
    await connectDB()
    const rates = await getCadRates()
    const usdToCAD = 1 / (rates['USD'] ?? 0.73)

    const product = await Product.findById(productId).lean() as Record<string, unknown> | null
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const sizes = (product.sizes as Array<Record<string, unknown>>) ?? []
    const matchedSize = sizes.find(s => s.size === size)
    const anyWithVWeight = sizes.find(s => s.variantWeight)

    const itemWeight = (matchedSize?.variantWeight as number) ?? (anyWithVWeight?.variantWeight as number) ?? (product.productWeight as number) ?? 0
    const totalWeight = itemWeight * (quantity ?? 1)

    // Try CJ call
    let cjResult = null
    if (totalWeight > 0) {
      try {
        cjResult = await getCJShippingInfo({
          startCountryCode: 'CN',
          endCountryCode: String(country ?? 'MA').toUpperCase(),
          productWeight: totalWeight,
          quantity: 1,
        })
      } catch (e) {
        cjResult = { error: String(e) }
      }
    }

    return NextResponse.json({
      productId,
      productWeight: product.productWeight,
      cjPid: product.cjPid,
      sizes: sizes.map(s => ({ size: s.size, variantWeight: s.variantWeight, cjVid: s.cjVid, cjSku: s.cjSku })),
      matchedSize,
      itemWeightUsed: itemWeight,
      totalWeight,
      usdToCAD,
      cjResult,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
