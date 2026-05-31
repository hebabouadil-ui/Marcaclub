import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import ShippingQuote from '@/lib/models/ShippingQuote'
import { getCJShippingInfo } from '@/lib/utils/cjApi'
import { getShippingFeeCAD } from '@/lib/utils/shippingFee'

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for shipping calculation with MongoDB snapshot cache.
//
// Problem: CJ API is non-deterministic — calling it twice with the same inputs
// can return different shipping options (method availability, rate changes).
// This caused the product/cart page to show one price and checkout another.
//
// Solution: computeShippingUSD() checks MongoDB first. On cache miss it calls
// CJ once, stores the result, and returns it. All surfaces share the snapshot:
//   product page → /api/shipping-estimate → computeShippingUSD (cache lookup)
//   cart page    → /api/shipping-estimate → computeShippingUSD (cache lookup)
//   checkout     → /api/stripe/create-payment-intent → computeShippingUSD (same lookup)
//   order create → uses shippingFee from payment intent (already locked in)
//
// Cache key: deterministic string from sorted items + country. If the cart
// changes or the country changes, the key changes → cache miss → fresh CJ call.
// Cache TTL: 4 hours (MongoDB TTL index on createdAt).
//
// DO NOT add a second option-selection algorithm anywhere. Change it here only.
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
  source: 'cj-sku' | 'cj-multipacket' | 'baked' | 'weight-static' | 'static' | 'cached'
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

// Cheapest option — deterministic, matches what product/cart pages show first.
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

// Stable cache key: "COUNTRY:pid1:size1:qty1|pid2:size2:qty2" sorted so
// item order in the cart doesn't affect the key.
function buildCacheKey(items: ShippingItem[], country: string): string {
  const sorted = [...items]
    .sort((a, b) => `${a.productId}:${a.size}`.localeCompare(`${b.productId}:${b.size}`))
    .map(i => `${i.productId}:${i.size}:${i.quantity}`)
    .join('|')
  return `${country.toUpperCase()}:${sorted}`
}

/**
 * Compute shipping cost in USD for a set of cart items to a destination country.
 * Reads from MongoDB snapshot cache; calls CJ API only on cache miss.
 * usdToCAD is used only for the weight/static fallback path.
 */
export async function computeShippingUSD(
  items: ShippingItem[],
  country: string,
  usdToCAD: number,
): Promise<ShippingResult> {
  const destCountry = String(country).toUpperCase()
  const cacheKey = buildCacheKey(items, destCountry)

  await connectDB()

  // ── Cache lookup ──────────────────────────────────────────────────────────
  const cached = await ShippingQuote.findOne({ cacheKey }).lean() as {
    shippingUSD: number; agingMin: number; agingMax: number; logisticName: string; source: string
  } | null

  if (cached) {
    console.log(`[computeShipping] cache HIT ${cacheKey} → $${cached.shippingUSD} USD`)
    return {
      shippingUSD: cached.shippingUSD,
      agingMin: cached.agingMin,
      agingMax: cached.agingMax,
      logisticName: cached.logisticName,
      source: 'cached',
    }
  }

  console.log(`[computeShipping] cache MISS ${cacheKey} — calling CJ`)

  // ── Live calculation ───────────────────────────────────────────────────────
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

    const sizeEntry = product.sizes?.find(s => s.size === item.size)
    const anySkuEntry = product.sizes?.find(s => s.cjSku || s.cjVid)
    const entry = (sizeEntry?.cjSku || sizeEntry?.cjVid) ? sizeEntry : anySkuEntry
    const variantSku = entry?.cjSku ?? ''
    if (variantSku) cjItems.push({ variantSku, totalQty: item.quantity })
  }

  let result: ShippingResult | null = null

  // Priority 1: live CJ API with SKU + full quantity (single shipment).
  if (hasCjPid && cjItems.length > 0) {
    try {
      const products = cjItems.map(i => ({ vid: '', variantSku: i.variantSku, quantity: i.totalQty }))
      const data = await getCJShippingInfo({ startCountryCode: 'CN', endCountryCode: destCountry, products })
      const options: ShippingOption[] = (data.result && Array.isArray(data.data)) ? data.data : []
      console.log(`[computeShipping] CJ response: ${options.length} options for ${destCountry}`)

      if (options.length > 0) {
        const best = pickBestOption(options)
        const { agingMin, agingMax } = parseAging(best)
        console.log(`[computeShipping] selected: ${best.logisticName} $${best.logisticPrice} USD`)
        result = {
          shippingUSD: Math.round(best.logisticPrice * 100) / 100,
          agingMin, agingMax,
          logisticName: best.logisticName ?? '',
          source: 'cj-sku',
        }
      } else {
        // Too heavy for one shipment — price one unit and multiply.
        const singleProducts = cjItems.map(i => ({ vid: '', variantSku: i.variantSku, quantity: 1 }))
        const singleData = await getCJShippingInfo({ startCountryCode: 'CN', endCountryCode: destCountry, products: singleProducts })
        const singleOptions: ShippingOption[] = (singleData.result && Array.isArray(singleData.data)) ? singleData.data : []

        if (singleOptions.length > 0) {
          const best = pickBestOption(singleOptions)
          const { agingMin, agingMax } = parseAging(best)
          const totalQty = cjItems.reduce((s, i) => s + i.totalQty, 0)
          result = {
            shippingUSD: Math.round(best.logisticPrice * totalQty * 100) / 100,
            agingMin, agingMax,
            logisticName: best.logisticName ?? '',
            source: 'cj-multipacket',
          }
        }
      }
    } catch (err) {
      console.warn('[computeShipping] CJ API failed:', err)
    }
  }

  // Priority 2: baked shipping from CJ import.
  if (!result && hasBakedData && maxBakedUSD > 0) {
    result = { shippingUSD: Math.round(maxBakedUSD * 100) / 100, agingMin: 0, agingMax: 0, logisticName: '', source: 'baked' }
  }

  // Priority 3: weight-based static estimate.
  if (!result && totalWeightG > 0) {
    const weightMultiplier = Math.max(1, totalWeightG / 300)
    const baseUSD = getShippingFeeCAD(destCountry, usdToCAD) / usdToCAD
    result = { shippingUSD: Math.round(baseUSD * weightMultiplier * 100) / 100, agingMin: 0, agingMax: 0, logisticName: '', source: 'weight-static' }
  }

  // Priority 4: static country table fallback.
  if (!result) {
    const fallbackUSD = getShippingFeeCAD(destCountry, usdToCAD) / usdToCAD
    result = { shippingUSD: Math.round(fallbackUSD * 100) / 100, agingMin: 0, agingMax: 0, logisticName: '', source: 'static' }
  }

  // ── Persist snapshot ───────────────────────────────────────────────────────
  try {
    await ShippingQuote.create({
      cacheKey,
      country: destCountry,
      shippingUSD: result.shippingUSD,
      agingMin: result.agingMin,
      agingMax: result.agingMax,
      logisticName: result.logisticName,
      source: result.source,
    })
    console.log(`[computeShipping] cached ${cacheKey} → $${result.shippingUSD} USD (${result.source})`)
  } catch (err) {
    // Duplicate key on race condition — safe to ignore (another request beat us to it)
    if ((err as { code?: unknown }).code !== 11000) {
      console.warn('[computeShipping] cache write failed:', err)
    }
  }

  return result
}
