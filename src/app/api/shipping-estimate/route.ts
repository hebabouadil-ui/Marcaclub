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

function pickBestOption(options: Array<{ logisticPrice: number; agingMax?: number; agingMin?: number }>) {
  const maxPrice = Math.max(...options.map(o => o.logisticPrice))
  const maxDays  = Math.max(...options.map(o => o.agingMax ?? o.agingMin ?? 30))
  return options
    .map(o => ({ ...o, score: (o.logisticPrice / (maxPrice || 1)) * 0.7 + ((o.agingMax ?? o.agingMin ?? 30) / (maxDays || 1)) * 0.3 }))
    .sort((a, b) => a.score - b.score)[0]
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

    // Collect CJ VIDs, baked shipping data, and total weight
    // CJ ships everything in ONE package — never sum individual costs
    const cjProducts: Array<{ vid: string; quantity: number; weight?: number }> = []
    let maxBakedUSD = 0
    let totalWeightG = 0
    let hasBakedData = false
    let hasCjPid = false

    for (const item of items) {
      const product = await Product.findById(item.productId).lean() as ProductDoc | null
      if (!product) continue

      if (product.productWeight) totalWeightG += product.productWeight * item.quantity

      if (product.shippingBakedUSD && product.shippingBakedUSD > 0) {
        if (product.shippingBakedUSD > maxBakedUSD) maxBakedUSD = product.shippingBakedUSD
        hasBakedData = true
      }

      if (!product.cjPid) continue
      hasCjPid = true
      const sizeEntry = product.sizes?.find(s => s.size === item.size)
      if (sizeEntry?.cjVid) cjProducts.push({ vid: sizeEntry.cjVid, quantity: item.quantity, weight: product.productWeight })
    }

    const totalUnits = items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0)
    const bakedUSD = maxBakedUSD * (1 + (totalUnits - 1) * 0.15)

    let shippingFeeCAD: number

    // Priority 1a: CJ API with real VIDs
    if (cjProducts.length > 0) {
      try {
        const cjData = await getCJShippingInfo({ startCountryCode: 'CN', endCountryCode: destCountry, products: cjProducts })
        const options: Array<{ logisticPrice: number; agingMax?: number; agingMin?: number }> =
          (cjData.result && Array.isArray(cjData.data)) ? cjData.data : []
        if (options.length > 0) {
          const best = pickBestOption(options)
          shippingFeeCAD = Math.round(best.logisticPrice * usdToCAD * 100) / 100
          console.log(`[shipping-estimate] CJ VID API: $${best.logisticPrice} USD → CA$${shippingFeeCAD} for ${destCountry}`)
          return NextResponse.json({ shippingFeeCAD, source: 'cj-api' })
        }
        console.warn(`[shipping-estimate] CJ VID API returned empty for ${destCountry}, trying weight fallback`)
      } catch (err) {
        console.warn('[shipping-estimate] CJ VID API failed:', err)
      }
    }

    // Priority 1b: CJ API with total weight (fallback when VID call returns empty or no VIDs stored)
    if (hasCjPid && totalWeightG > 0) {
      try {
        const cjData = await getCJShippingInfo({
          startCountryCode: 'CN',
          endCountryCode: destCountry,
          productWeight: totalWeightG,
          quantity: totalUnits,
        })
        const options: Array<{ logisticPrice: number; agingMax?: number; agingMin?: number }> =
          (cjData.result && Array.isArray(cjData.data)) ? cjData.data : []
        if (options.length > 0) {
          const best = pickBestOption(options)
          shippingFeeCAD = Math.round(best.logisticPrice * usdToCAD * 100) / 100
          console.log(`[shipping-estimate] CJ weight API: $${best.logisticPrice} USD → CA$${shippingFeeCAD} for ${destCountry}`)
          return NextResponse.json({ shippingFeeCAD, source: 'cj-api-weight' })
        }
      } catch (err) {
        console.warn('[shipping-estimate] CJ weight API failed:', err)
      }
    }

    // Priority 2: baked shipping stored at import time (scaled by extra units)
    if (hasBakedData && bakedUSD > 0) {
      shippingFeeCAD = Math.round(bakedUSD * usdToCAD * 100) / 100
      console.log(`[shipping-estimate] Baked: $${bakedUSD} USD → CA$${shippingFeeCAD} for ${destCountry}`)
      return NextResponse.json({ shippingFeeCAD, source: 'baked' })
    }

    // Priority 3: weight-based estimate using productWeight
    if (totalWeightG > 0) {
      const baseWeight = 300
      const weightMultiplier = Math.max(1, totalWeightG / baseWeight)
      const baseCAD = getShippingFeeCAD(destCountry, usdToCAD)
      shippingFeeCAD = Math.round(baseCAD * weightMultiplier * 100) / 100
      console.log(`[shipping-estimate] Weight-based: ${totalWeightG}g × ${weightMultiplier.toFixed(2)} → CA$${shippingFeeCAD} for ${destCountry}`)
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
