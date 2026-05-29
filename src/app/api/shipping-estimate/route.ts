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
  sizes?: Array<{ size: string; cjVid?: string; cjSku?: string; variantWeight?: number }>
  cjData?: { variants?: Array<{ weight?: number; variantWeight?: number }> }
}

interface ShippingOption {
  logisticName?: string
  logisticPrice: number
  agingMax?: number
  agingMin?: number
  [key: string]: unknown
}

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

    let maxBakedUSD = 0
    let totalWeightG = 0
    let hasBakedData = false
    let hasCjPid = false
    // Fallback VID/SKU products — only used if we have no weight data at all
    const cjProductsFallback: Array<{ vid: string; variantSku?: string; quantity: number }> = []

    for (const item of items) {
      const product = await Product.findById(item.productId).lean() as ProductDoc | null
      if (!product) continue

      // Weight priority: matched-size variantWeight → any-size variantWeight →
      // productWeight → cjData.variants[0].weight (always stored from CJ import)
      const matchedSize = product.sizes?.find(s => s.size === item.size)
      const anySize = product.sizes?.find(s => s.variantWeight)
      const cjVariantWeight = product.cjData?.variants?.[0]?.weight ?? product.cjData?.variants?.[0]?.variantWeight ?? 0
      const itemWeight = matchedSize?.variantWeight ?? anySize?.variantWeight ?? product.productWeight ?? cjVariantWeight
      console.log(`[shipping-estimate] product weight sources: matchedVariant=${matchedSize?.variantWeight} anyVariant=${anySize?.variantWeight} productWeight=${product.productWeight} cjData=${cjVariantWeight} → using ${itemWeight}g`)
      if (itemWeight) totalWeightG += itemWeight * item.quantity

      if (product.shippingBakedUSD && product.shippingBakedUSD > 0) {
        if (product.shippingBakedUSD > maxBakedUSD) maxBakedUSD = product.shippingBakedUSD
        hasBakedData = true
      }

      if (!product.cjPid) continue
      hasCjPid = true

      // Only collect VID/SKU as fallback for products with no stored weight
      if (!product.productWeight) {
        const sizeEntry = product.sizes?.find(s => s.size === item.size)
        const anyVidEntry = product.sizes?.find(s => s.cjVid || s.cjSku)
        const entry = (sizeEntry?.cjVid || sizeEntry?.cjSku) ? sizeEntry : anyVidEntry
        const vid = entry?.cjVid ?? ''
        const variantSku = entry?.cjSku ?? ''
        if (vid || variantSku) {
          cjProductsFallback.push({ vid, variantSku: variantSku || undefined, quantity: item.quantity })
        }
      }
    }

    let shippingFeeCAD: number

    // Priority 1: CJ API with total weight (most accurate — productWeight × quantity per item)
    // This bypasses VID precision issues entirely; weight is computed from our own DB.
    if (hasCjPid && totalWeightG > 0) {
      try {
        console.log(`[shipping-estimate] CJ weight call: ${totalWeightG}g → ${destCountry}`)
        const cjData = await getCJShippingInfo({
          startCountryCode: 'CN',
          endCountryCode: destCountry,
          productWeight: totalWeightG,
          quantity: 1,
        })
        console.log('[shipping-estimate] CJ response:', JSON.stringify(cjData).slice(0, 500))
        const options: ShippingOption[] = (cjData.result && Array.isArray(cjData.data)) ? cjData.data : []
        if (options.length > 0) {
          const best = pickBestOption(options)
          const { agingMin, agingMax } = parseAging(best)
          shippingFeeCAD = Math.round(best.logisticPrice * usdToCAD * 100) / 100
          console.log(`[shipping-estimate] picked ${best.logisticName} $${best.logisticPrice} USD → CA$${shippingFeeCAD}`)
          return NextResponse.json({ shippingFeeCAD, agingMin, agingMax, logisticName: best.logisticName, source: 'cj-weight' })
        }

        // CJ returned empty — total weight exceeds per-packet limit for this route.
        // Find the max working weight (try 1900g, 1500g, 1000g, single-unit) and multiply by
        // number of packets needed: ceil(totalWeightG / maxPacketWeight).
        console.warn(`[shipping-estimate] CJ empty for ${totalWeightG}g — finding max packet weight`)
        const candidateWeights = [1900, 1500, 1000, 500]
        // Also try single unit weight if known
        const singleUnitWeight = items.length > 0 ? totalWeightG / items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0) : 0
        if (singleUnitWeight > 0 && !candidateWeights.includes(Math.round(singleUnitWeight))) {
          candidateWeights.push(Math.round(singleUnitWeight))
        }
        for (const tryWeight of candidateWeights) {
          if (tryWeight >= totalWeightG) continue // already tried, was empty
          const tryData = await getCJShippingInfo({ startCountryCode: 'CN', endCountryCode: destCountry, productWeight: tryWeight, quantity: 1 })
          const tryOptions: ShippingOption[] = (tryData.result && Array.isArray(tryData.data)) ? tryData.data : []
          if (tryOptions.length > 0) {
            const best = pickBestOption(tryOptions)
            const { agingMin, agingMax } = parseAging(best)
            const packets = Math.ceil(totalWeightG / tryWeight)
            const totalPrice = best.logisticPrice * packets
            shippingFeeCAD = Math.round(totalPrice * usdToCAD * 100) / 100
            console.log(`[shipping-estimate] ${packets} packets×${tryWeight}g: ${best.logisticName} $${best.logisticPrice}×${packets} → CA$${shippingFeeCAD}`)
            return NextResponse.json({ shippingFeeCAD, agingMin, agingMax, logisticName: best.logisticName, source: 'cj-multipacket' })
          }
        }
        console.warn('[shipping-estimate] CJ weight returned empty options for all candidate weights, falling back')
      } catch (err) {
        console.warn('[shipping-estimate] CJ weight API failed:', err)
      }
    }

    // Priority 2: CJ API with VID/SKU (for CJ products where productWeight is not stored)
    if (cjProductsFallback.length > 0) {
      try {
        console.log('[shipping-estimate] CJ VID/SKU fallback call:', JSON.stringify(cjProductsFallback))
        const cjData = await getCJShippingInfo({ startCountryCode: 'CN', endCountryCode: destCountry, products: cjProductsFallback })
        const options: ShippingOption[] = (cjData.result && Array.isArray(cjData.data)) ? cjData.data : []
        if (options.length > 0) {
          const best = pickBestOption(options)
          const { agingMin, agingMax } = parseAging(best)
          shippingFeeCAD = Math.round(best.logisticPrice * usdToCAD * 100) / 100
          return NextResponse.json({ shippingFeeCAD, agingMin, agingMax, logisticName: best.logisticName, source: 'cj-vid' })
        }
      } catch (err) {
        console.warn('[shipping-estimate] CJ VID/SKU API failed:', err)
      }
    }

    // Priority 3: baked shipping
    if (hasBakedData && maxBakedUSD > 0) {
      shippingFeeCAD = Math.round(maxBakedUSD * usdToCAD * 100) / 100
      return NextResponse.json({ shippingFeeCAD, source: 'baked' })
    }

    // Priority 4: weight-based static estimate
    if (totalWeightG > 0) {
      const baseWeight = 300
      const weightMultiplier = Math.max(1, totalWeightG / baseWeight)
      const baseCAD = getShippingFeeCAD(destCountry, usdToCAD)
      shippingFeeCAD = Math.round(baseCAD * weightMultiplier * 100) / 100
      return NextResponse.json({ shippingFeeCAD, source: 'weight-static' })
    }

    // Priority 5: static table fallback
    shippingFeeCAD = getShippingFeeCAD(destCountry, usdToCAD)
    return NextResponse.json({ shippingFeeCAD, source: 'static' })

  } catch (err) {
    console.error('shipping-estimate error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
