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

async function callCJ(destCountry: string, variantSku: string, quantity: number) {
  const data = await getCJShippingInfo({
    startCountryCode: 'CN',
    endCountryCode: destCountry,
    products: [{ vid: '', variantSku, quantity }],
  })
  return (data.result && Array.isArray(data.data)) ? data.data as ShippingOption[] : []
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

    // Collect per-product info: best SKU and total quantity
    interface CJItem { variantSku: string; totalQty: number }
    const cjItems: CJItem[] = []
    let maxBakedUSD = 0
    let totalWeightG = 0
    let hasBakedData = false
    let hasCjPid = false

    for (const item of items) {
      const product = await Product.findById(item.productId).lean() as ProductDoc | null
      if (!product) continue

      const matchedSize = product.sizes?.find(s => s.size === item.size)
      const anySize = product.sizes?.find(s => s.variantWeight)
      const cjVariantWeight = product.cjData?.variants?.[0]?.weight ?? product.cjData?.variants?.[0]?.variantWeight ?? 0
      const itemWeight = matchedSize?.variantWeight ?? anySize?.variantWeight ?? product.productWeight ?? cjVariantWeight
      if (itemWeight) totalWeightG += itemWeight * item.quantity

      if (product.shippingBakedUSD && product.shippingBakedUSD > 0) {
        if (product.shippingBakedUSD > maxBakedUSD) maxBakedUSD = product.shippingBakedUSD
        hasBakedData = true
      }

      if (!product.cjPid) continue
      hasCjPid = true

      // Find the best SKU — prefer size match with SKU, else any SKU
      const sizeEntry = product.sizes?.find(s => s.size === item.size)
      const anySkuEntry = product.sizes?.find(s => s.cjSku || s.cjVid)
      const entry = (sizeEntry?.cjSku || sizeEntry?.cjVid) ? sizeEntry : anySkuEntry
      const variantSku = entry?.cjSku ?? ''
      if (variantSku) {
        cjItems.push({ variantSku, totalQty: item.quantity })
      }
    }

    // respond with both USD (for accurate client-side display) and CAD (for order totals)
    const respond = (usd: number, extra: Record<string, unknown> = {}) => {
      const cadVal = Math.round(usd * usdToCAD * 100) / 100
      return NextResponse.json({ shippingFeeUSD: Math.round(usd * 100) / 100, shippingFeeCAD: cadVal, ...extra })
    }

    // Priority 1: CJ API with SKU + full quantity
    // CJ computes weight = variant_weight × quantity internally.
    // If total is too heavy (CJ returns empty), retry with qty=1 per SKU and multiply.
    if (hasCjPid && cjItems.length > 0) {
      try {
        // Try all items at full quantity first (single shipment)
        const products = cjItems.map(i => ({ vid: '', variantSku: i.variantSku, quantity: i.totalQty }))
        console.log('[shipping-estimate] CJ call full qty:', JSON.stringify({ destCountry, products }))
        const data = await getCJShippingInfo({ startCountryCode: 'CN', endCountryCode: destCountry, products })
        const options: ShippingOption[] = (data.result && Array.isArray(data.data)) ? data.data : []
        console.log('[shipping-estimate] CJ full qty response: result=', data.result, 'options=', options.length, 'msg=', data.message)

        if (options.length > 0) {
          const best = pickBestOption(options)
          const { agingMin, agingMax } = parseAging(best)
          console.log(`[shipping-estimate] single shipment: ${best.logisticName} $${best.logisticPrice} USD`)
          return respond(best.logisticPrice, { agingMin, agingMax, logisticName: best.logisticName, source: 'cj-sku' })
        }

        // Too heavy for one shipment — get per-unit price and multiply packets
        console.warn('[shipping-estimate] full qty empty, trying qty=1 for packet estimate')
        const singleProducts = cjItems.map(i => ({ vid: '', variantSku: i.variantSku, quantity: 1 }))
        const singleData = await getCJShippingInfo({ startCountryCode: 'CN', endCountryCode: destCountry, products: singleProducts })
        const singleOptions: ShippingOption[] = (singleData.result && Array.isArray(singleData.data)) ? singleData.data : []
        console.log('[shipping-estimate] CJ qty=1 response: result=', singleData.result, 'options=', singleOptions.length, 'msg=', singleData.message)

        if (singleOptions.length > 0) {
          const best = pickBestOption(singleOptions)
          const { agingMin, agingMax } = parseAging(best)
          // Total packets = sum of all item quantities (worst case: 1 item per packet)
          const totalQty = cjItems.reduce((s, i) => s + i.totalQty, 0)
          const totalUSD = best.logisticPrice * totalQty
          console.log(`[shipping-estimate] ${totalQty} packets×qty1: ${best.logisticName} $${best.logisticPrice}×${totalQty} = $${totalUSD} USD`)
          return respond(totalUSD, { agingMin, agingMax, logisticName: best.logisticName, source: 'cj-multipacket' })
        }
        console.warn('[shipping-estimate] CJ qty=1 also empty, falling back. msg:', singleData.message)
      } catch (err) {
        console.warn('[shipping-estimate] CJ API failed:', err)
      }
    }

    // Priority 2: baked shipping
    if (hasBakedData && maxBakedUSD > 0) {
      return respond(maxBakedUSD, { source: 'baked' })
    }

    // Priority 3: weight-based static estimate
    if (totalWeightG > 0) {
      const baseWeight = 300
      const weightMultiplier = Math.max(1, totalWeightG / baseWeight)
      const baseUSD = getShippingFeeCAD(destCountry, usdToCAD) / usdToCAD
      return respond(baseUSD * weightMultiplier, { source: 'weight-static' })
    }

    // Priority 4: static table fallback
    const fallbackUSD = getShippingFeeCAD(destCountry, usdToCAD) / usdToCAD
    return respond(fallbackUSD, { source: 'static' })

  } catch (err) {
    console.error('shipping-estimate error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
