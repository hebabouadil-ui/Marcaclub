import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import { getCJShippingInfo } from '@/lib/utils/cjApi'
import { getShippingFeeCAD } from '@/lib/utils/shippingFee'
import { getCadRates } from '@/lib/utils/getRates'

export const dynamic = 'force-dynamic'

interface ProductDoc {
  cjPid?: string
  productWeight?: number
  shippingBakedUSD?: number
  shippingRefCountry?: string
  sizes?: Array<{ size: string; cjVid?: string }>
}

export async function POST(req: NextRequest) {
  try {
    const { items, country } = await req.json()
    if (!Array.isArray(items) || !country) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const rates = await getCadRates()
    const usdToCAD = 1 / (rates['USD'] ?? 0.73)
    const destCountry = String(country).toUpperCase()

    await connectDB()

    // Collect CJ VIDs and baked shipping data per product
    const cjProducts: Array<{ vid: string; quantity: number }> = []
    let totalBakedUSD = 0
    let totalWeightG = 0
    let hasBakedData = false

    for (const item of items) {
      const product = await Product.findById(item.productId).lean() as ProductDoc | null
      if (!product) continue

      // Accumulate weight for weight-based fallback
      if (product.productWeight) totalWeightG += product.productWeight * item.quantity

      // Accumulate baked shipping (per unit, scale by quantity)
      if (product.shippingBakedUSD && product.shippingBakedUSD > 0) {
        // Base cost for 1 unit; each additional unit adds 30% incremental cost
        totalBakedUSD += product.shippingBakedUSD * (1 + (item.quantity - 1) * 0.3)
        hasBakedData = true
      }

      if (!product.cjPid) continue
      const sizeEntry = product.sizes?.find(s => s.size === item.size)
      if (sizeEntry?.cjVid) cjProducts.push({ vid: sizeEntry.cjVid, quantity: item.quantity })
    }

    let shippingFeeCAD: number

    // Priority 1: live CJ API with real VIDs + quantities
    if (cjProducts.length > 0) {
      try {
        const cjData = await getCJShippingInfo({
          startCountryCode: 'CN',
          endCountryCode: destCountry,
          products: cjProducts,
        })
        const options: Array<{ logisticPrice: number; agingMax?: number; agingMin?: number }> =
          (cjData.result && Array.isArray(cjData.data)) ? cjData.data : []

        if (options.length > 0) {
          const maxPrice = Math.max(...options.map(o => o.logisticPrice))
          const maxDays  = Math.max(...options.map(o => o.agingMax ?? o.agingMin ?? 30))
          const best = options
            .map(o => ({ ...o, score: (o.logisticPrice / (maxPrice || 1)) * 0.7 + ((o.agingMax ?? o.agingMin ?? 30) / (maxDays || 1)) * 0.3 }))
            .sort((a, b) => a.score - b.score)[0]
          shippingFeeCAD = Math.round(best.logisticPrice * usdToCAD * 100) / 100
          console.log(`[shipping-estimate] CJ API: $${best.logisticPrice} USD → CA$${shippingFeeCAD} for ${destCountry}`)
          return NextResponse.json({ shippingFeeCAD, source: 'cj-api' })
        }
      } catch (err) {
        console.warn('[shipping-estimate] CJ API failed:', err)
      }
    }

    // Priority 2: baked shipping stored at import time (scaled by quantity)
    if (hasBakedData && totalBakedUSD > 0) {
      shippingFeeCAD = Math.round(totalBakedUSD * usdToCAD * 100) / 100
      console.log(`[shipping-estimate] Baked: $${totalBakedUSD} USD → CA$${shippingFeeCAD} for ${destCountry}`)
      return NextResponse.json({ shippingFeeCAD, source: 'baked' })
    }

    // Priority 3: weight-based estimate using productWeight
    if (totalWeightG > 0) {
      const baseUSD = getShippingFeeCAD(destCountry, 1) // get USD equivalent
      const baseWeight = 300 // grams baseline
      const weightMultiplier = Math.max(1, totalWeightG / baseWeight)
      const weightedUSD = (getShippingFeeCAD(destCountry, 1) * weightMultiplier)
      shippingFeeCAD = Math.round(weightedUSD * usdToCAD * 100) / 100
      console.log(`[shipping-estimate] Weight-based: ${totalWeightG}g → CA$${shippingFeeCAD} for ${destCountry}`)
      return NextResponse.json({ shippingFeeCAD, source: 'weight' })
    }

    // Priority 4: static table fallback
    shippingFeeCAD = getShippingFeeCAD(destCountry, usdToCAD)
    console.log(`[shipping-estimate] Static table: CA$${shippingFeeCAD} for ${destCountry}`)
    return NextResponse.json({ shippingFeeCAD, source: 'static' })

  } catch (err) {
    console.error('shipping-estimate error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
