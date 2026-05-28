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
  sizes?: Array<{ size: string; cjVid?: string }>
}

interface ShippingOption {
  logisticName?: string
  logisticPrice: number
  agingMax?: number
  agingMin?: number
  [key: string]: unknown
}

// CJ picks the cheapest applicable method for fulfillment — mirror that logic
function pickBestOption(options: ShippingOption[]): ShippingOption {
  return [...options].sort((a, b) => a.logisticPrice - b.logisticPrice)[0]
}

function parseAging(opt: ShippingOption): { agingMin: number; agingMax: number } {
  let agingMin = opt.agingMin ?? 0
  let agingMax = opt.agingMax ?? 0
  if (!agingMin || !agingMax) {
    const s = (opt as Record<string, unknown>).logisticAging ?? (opt as Record<string, unknown>).aging ?? ''
    if (s) {
      const p = String(s).split('-')
      agingMin = parseInt(p[0]) || 0
      agingMax = parseInt(p[1] ?? p[0]) || 0
    }
  }
  return { agingMin, agingMax }
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
      // Try exact size match first, then any VID from the product as fallback
      const sizeEntry = product.sizes?.find(s => s.size === item.size)
      const anyVidEntry = product.sizes?.find(s => s.cjVid)
      const vid = sizeEntry?.cjVid ?? anyVidEntry?.cjVid
      if (vid) cjProducts.push({ vid, quantity: item.quantity, weight: product.productWeight })
    }

    const totalUnits = items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0)
    // CJ ships everything in one package — baked shipping is a per-shipment cost, never scale by unit count
    const bakedUSD = maxBakedUSD

    let shippingFeeCAD: number

    // Priority 1a: CJ API with real VIDs
    if (cjProducts.length > 0) {
      try {
        const cjData = await getCJShippingInfo({ startCountryCode: 'CN', endCountryCode: destCountry, products: cjProducts })
        const options: ShippingOption[] = (cjData.result && Array.isArray(cjData.data)) ? cjData.data : []
        if (options.length > 0) {
          const best = pickBestOption(options)
          const { agingMin, agingMax } = parseAging(best)
          shippingFeeCAD = Math.round(best.logisticPrice * usdToCAD * 100) / 100
          return NextResponse.json({ shippingFeeCAD, agingMin, agingMax, logisticName: best.logisticName, source: 'cj-api' })
        }
      } catch (err) {
        console.warn('[shipping-estimate] CJ VID API failed:', err)
      }
    }

    // Priority 1b: CJ API with total weight
    if (hasCjPid && totalWeightG > 0) {
      try {
        const cjData = await getCJShippingInfo({
          startCountryCode: 'CN',
          endCountryCode: destCountry,
          productWeight: totalWeightG,
          quantity: totalUnits,
        })
        const options: ShippingOption[] = (cjData.result && Array.isArray(cjData.data)) ? cjData.data : []
        if (options.length > 0) {
          const best = pickBestOption(options)
          const { agingMin, agingMax } = parseAging(best)
          shippingFeeCAD = Math.round(best.logisticPrice * usdToCAD * 100) / 100
          return NextResponse.json({ shippingFeeCAD, agingMin, agingMax, logisticName: best.logisticName, source: 'cj-api-weight' })
        }
      } catch (err) {
        console.warn('[shipping-estimate] CJ weight API failed:', err)
      }
    }

    // Priority 2: baked shipping
    if (hasBakedData && bakedUSD > 0) {
      shippingFeeCAD = Math.round(bakedUSD * usdToCAD * 100) / 100
      return NextResponse.json({ shippingFeeCAD, source: 'baked' })
    }

    // Priority 3: weight-based estimate
    if (totalWeightG > 0) {
      const baseWeight = 300
      const weightMultiplier = Math.max(1, totalWeightG / baseWeight)
      const baseCAD = getShippingFeeCAD(destCountry, usdToCAD)
      shippingFeeCAD = Math.round(baseCAD * weightMultiplier * 100) / 100
      return NextResponse.json({ shippingFeeCAD, source: 'weight' })
    }

    // Priority 4: static table fallback
    shippingFeeCAD = getShippingFeeCAD(destCountry, usdToCAD)
    return NextResponse.json({ shippingFeeCAD, source: 'static' })

  } catch (err) {
    console.error('shipping-estimate error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
