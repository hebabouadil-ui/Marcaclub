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
    const cjVariants = ((product.cjData as Record<string, unknown>)?.variants as Array<Record<string, unknown>>) ?? []
    const cjVariantWeight = (cjVariants[0]?.weight as number) ?? (cjVariants[0]?.variantWeight as number) ?? 0

    const itemWeight = (matchedSize?.variantWeight as number) ?? (anyWithVWeight?.variantWeight as number) ?? (product.productWeight as number) ?? cjVariantWeight ?? 0
    const totalWeight = itemWeight * (quantity ?? 1)

    // Test multiple weights to find where CJ stops having options
    const testWeights = Array.from(new Set([totalWeight, 1900, 1500, 1000, 800, itemWeight, 500, 300].filter(w => w > 0))).sort((a,b) => b-a)
    const weightTests: Record<number, unknown> = {}
    for (const w of testWeights) {
      try {
        const r = await getCJShippingInfo({ startCountryCode: 'CN', endCountryCode: String(country ?? 'MA').toUpperCase(), productWeight: w, quantity: 1 })
        const opts = (r.result && Array.isArray(r.data)) ? r.data : []
        // Show raw response for first weight to diagnose auth/API issues
        weightTests[w] = w === testWeights[0]
          ? { result: r.result, message: r.message, code: r.code, optionCount: opts.length, rawSlice: JSON.stringify(r).slice(0, 300) }
          : { result: r.result, message: r.message, optionCount: opts.length }
      } catch (e) {
        weightTests[w] = { error: String(e) }
      }
    }

    return NextResponse.json({
      productId,
      productWeight: product.productWeight,
      cjPid: product.cjPid,
      sizes: sizes.map(s => ({ size: s.size, variantWeight: s.variantWeight, cjSku: s.cjSku })),
      itemWeightUsed: itemWeight,
      totalWeight,
      weightTests,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
