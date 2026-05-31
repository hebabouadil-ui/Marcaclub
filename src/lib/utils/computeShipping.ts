import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import { getCJShippingInfo } from '@/lib/utils/cjApi'
import { getShippingFeeCAD } from '@/lib/utils/shippingFee'

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for shipping calculation.
//
// Every surface that needs a shipping price — product page, cart page, checkout
// display, AND the Stripe payment intent — calls computeShippingUSD(). It returns
// the cost in USD only; callers convert to CAD/display currency with the SAME
// usdToCAD factor (1 / rates['USD']) and the SAME rounding. Because the input,
// the CJ request, the option-selection algorithm and the base USD value are all
// identical, every page necessarily shows the exact same shipping amount.
//
// DO NOT add a second selection algorithm anywhere. If selection logic must
// change, change it HERE so all surfaces move together.
// ─────────────────────────────────────────────────────────────────────────────

export interface ShippingItem {
  productId: string
  size: string
  quantity: number
}

export interface ShippingResult {
  /** Shipping cost in USD — the canonical base value. */
  shippingUSD: number
  agingMin: number
  agingMax: number
  logisticName: string
  source: 'cj-sku' | 'cj-multipacket' | 'baked' | 'weight-static' | 'static'
}

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

// Canonical option selection: the cheapest available option.
// This is the value customers see first on the product/cart page, so it is the
// single value charged at checkout. Deterministic — no price/speed weighting.
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

/**
 * Compute shipping cost in USD for a set of cart items to a destination country.
 * usdToCAD is only used for the weight/static fallback table (which is defined in
 * CAD); the CJ-derived price is returned untouched in USD.
 */
export async function computeShippingUSD(
  items: ShippingItem[],
  country: string,
  usdToCAD: number,
): Promise<ShippingResult> {
  const destCountry = String(country).toUpperCase()
  await connectDB()

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

    // Prefer the size-matched SKU, else any SKU. SKU is precise (no 19-digit
    // precision loss like vid) — this is why CJ requests use SKU everywhere.
    const sizeEntry = product.sizes?.find(s => s.size === item.size)
    const anySkuEntry = product.sizes?.find(s => s.cjSku || s.cjVid)
    const entry = (sizeEntry?.cjSku || sizeEntry?.cjVid) ? sizeEntry : anySkuEntry
    const variantSku = entry?.cjSku ?? ''
    if (variantSku) cjItems.push({ variantSku, totalQty: item.quantity })
  }

  // Priority 1: live CJ API with SKU + full quantity (single shipment).
  if (hasCjPid && cjItems.length > 0) {
    try {
      const products = cjItems.map(i => ({ vid: '', variantSku: i.variantSku, quantity: i.totalQty }))
      const data = await getCJShippingInfo({ startCountryCode: 'CN', endCountryCode: destCountry, products })
      const options: ShippingOption[] = (data.result && Array.isArray(data.data)) ? data.data : []

      if (options.length > 0) {
        const best = pickBestOption(options)
        const { agingMin, agingMax } = parseAging(best)
        return {
          shippingUSD: Math.round(best.logisticPrice * 100) / 100,
          agingMin, agingMax,
          logisticName: best.logisticName ?? '',
          source: 'cj-sku',
        }
      }

      // Too heavy for one shipment — price one unit and multiply by packet count.
      const singleProducts = cjItems.map(i => ({ vid: '', variantSku: i.variantSku, quantity: 1 }))
      const singleData = await getCJShippingInfo({ startCountryCode: 'CN', endCountryCode: destCountry, products: singleProducts })
      const singleOptions: ShippingOption[] = (singleData.result && Array.isArray(singleData.data)) ? singleData.data : []

      if (singleOptions.length > 0) {
        const best = pickBestOption(singleOptions)
        const { agingMin, agingMax } = parseAging(best)
        const totalQty = cjItems.reduce((s, i) => s + i.totalQty, 0)
        return {
          shippingUSD: Math.round(best.logisticPrice * totalQty * 100) / 100,
          agingMin, agingMax,
          logisticName: best.logisticName ?? '',
          source: 'cj-multipacket',
        }
      }
    } catch (err) {
      console.warn('[computeShipping] CJ API failed:', err)
    }
  }

  // Priority 2: baked shipping from import.
  if (hasBakedData && maxBakedUSD > 0) {
    return { shippingUSD: Math.round(maxBakedUSD * 100) / 100, agingMin: 0, agingMax: 0, logisticName: '', source: 'baked' }
  }

  // Priority 3: weight-based static estimate.
  if (totalWeightG > 0) {
    const baseWeight = 300
    const weightMultiplier = Math.max(1, totalWeightG / baseWeight)
    const baseUSD = getShippingFeeCAD(destCountry, usdToCAD) / usdToCAD
    return { shippingUSD: Math.round(baseUSD * weightMultiplier * 100) / 100, agingMin: 0, agingMax: 0, logisticName: '', source: 'weight-static' }
  }

  // Priority 4: static table fallback.
  const fallbackUSD = getShippingFeeCAD(destCountry, usdToCAD) / usdToCAD
  return { shippingUSD: Math.round(fallbackUSD * 100) / 100, agingMin: 0, agingMax: 0, logisticName: '', source: 'static' }
}
