const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1'

let cachedToken: string | null = null
let tokenExpiry = 0

export async function getCJToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: process.env.CJ_API_KEY }),
  })
  const data = await res.json()
  if (!data.result || !data.data?.accessToken) {
    throw new Error(`CJ auth failed: ${JSON.stringify(data)}`)
  }
  cachedToken = data.data.accessToken
  tokenExpiry = Date.now() + (data.data.accessTokenExpiryDate
    ? new Date(data.data.accessTokenExpiryDate).getTime() - Date.now() - 30 * 60 * 1000
    : 23 * 60 * 60 * 1000)
  return cachedToken!
}

async function cjFetch(path: string, options: RequestInit = {}) {
  const token = await getCJToken()
  const res = await fetch(`${CJ_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'CJ-Access-Token': token,
      ...(options.headers ?? {}),
    },
  })
  return res.json()
}

export interface CJProduct {
  pid: string
  productNameEn: string
  productImage: string
  productWeight: number
  sellingPrice: number
  categoryId: string
  categoryName: string
  variants: CJVariant[]
  shippingTime?: string
}

export interface CJVariant {
  vid: string
  variantSku: string
  variantNameEn: string
  variantImage: string
  variantPrice: number
  variantWeight: number
  variantStock: number
  variantKey?: string
}

export async function searchCJProducts(params: {
  productName?: string
  productSku?: string
  categoryId?: string
  pageNum?: number
  pageSize?: number
  countryCode?: string
}) {
  const query = new URLSearchParams({
    pageNum: String(params.pageNum ?? 1),
    pageSize: String(params.pageSize ?? 20),
    ...(params.productName ? { productName: params.productName } : {}),
    ...(params.productSku ? { productSku: params.productSku } : {}),
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
  })
  const data = await cjFetch(`/product/list?${query}`)
  return data
}

export async function getCJProductDetail(pid: string) {
  const data = await cjFetch(`/product/query?pid=${pid}`)
  return data
}

export async function getCJShippingInfo(params: {
  startCountryCode: string
  endCountryCode: string
  productWeight?: number
  quantity?: number
  vid?: string
  variantSku?: string
  products?: Array<{ vid: string; variantSku?: string; quantity: number; weight?: number }>
}) {
  // When vid is provided, do NOT send weight — CJ knows the product weight from its own DB.
  // Sending weight alongside vid overrides CJ's data and causes price mismatches.
  const products = params.products && params.products.length > 0
    ? params.products.map(p => ({
        quantity: p.quantity,
        ...(p.vid ? { vid: p.vid } : {}),
        ...(p.variantSku ? { variantSku: p.variantSku } : {}),
        // Only include weight when no vid/sku — weight-only fallback path
        ...(!p.vid && !p.variantSku && p.weight ? { weight: p.weight } : {}),
      }))
    : [{
        quantity: params.quantity ?? 1,
        ...(params.vid ? { vid: params.vid } : {}),
        ...(params.variantSku ? { variantSku: params.variantSku } : {}),
        // Only send weight when no identifier available
        ...(!params.vid && !params.variantSku ? { weight: params.productWeight ?? 300 } : {}),
      }]

  const data = await cjFetch('/logistic/freightCalculate', {
    method: 'POST',
    body: JSON.stringify({
      startCountryCode: params.startCountryCode,
      endCountryCode: params.endCountryCode,
      products,
    }),
  })
  return data
}

export interface CJOrderItem {
  vid: string
  variantSku?: string
  quantity: number
}

export interface CJOrderAddress {
  firstName: string
  lastName: string
  phone: string
  email: string
  country: string
  province: string
  city: string
  address: string
  zip: string
}

export async function createCJOrder(params: {
  orderNumber: string
  shippingAddress: CJOrderAddress
  products: CJOrderItem[]
  logisticName?: string
}) {
  const payload: Record<string, unknown> = {
    orderNumber: params.orderNumber,
    fromCountryCode: 'CN',
    ...(params.logisticName ? { logisticName: params.logisticName } : {}),
    shippingZip: params.shippingAddress.zip,
    shippingCountry: params.shippingAddress.country,
    shippingCountryCode: params.shippingAddress.country,
    shippingProvince: params.shippingAddress.province,
    shippingCity: params.shippingAddress.city,
    shippingAddress: params.shippingAddress.address,
    shippingCustomerName: `${params.shippingAddress.firstName} ${params.shippingAddress.lastName}`,
    shippingPhone: params.shippingAddress.phone,
    remark: '',
    products: params.products.map((p) => {
      const vid = (p.vid ?? '').trim()
      const variantSku = (p.variantSku ?? '').trim()
      return {
        ...(vid ? { vid } : {}),
        ...(variantSku ? { variantSku } : {}),
        quantity: p.quantity,
      }
    }),
  }
  const data = await cjFetch('/shopping/order/createOrderV2', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data
}

// Known-good CJ logistic names per destination country (fallback when API returns nothing)
// These are the cheapest/standard options confirmed to work on the CJ platform
const CJ_LOGISTIC_FALLBACK: Record<string, string> = {
  // North Africa
  MA: 'CJPacket Ordinary', DZ: 'CJPacket Ordinary', TN: 'CJPacket Ordinary',
  LY: 'CJPacket Ordinary', EG: 'CJPacket Ordinary',
  // Middle East
  AE: 'CJPacket Ordinary', SA: 'CJPacket Ordinary', QA: 'CJPacket Ordinary',
  KW: 'CJPacket Ordinary', BH: 'CJPacket Ordinary', OM: 'CJPacket Ordinary',
  JO: 'CJPacket Ordinary',
  // North America
  US: 'USPS', CA: 'CJPacket Ordinary', MX: 'CJPacket Ordinary',
  // Western Europe
  FR: 'CJPacket EU', DE: 'CJPacket EU', GB: 'CJPacket Ordinary',
  ES: 'CJPacket EU', IT: 'CJPacket EU', NL: 'CJPacket EU',
  BE: 'CJPacket EU', PT: 'CJPacket EU', CH: 'CJPacket Ordinary',
  AT: 'CJPacket EU', IE: 'CJPacket EU', SE: 'CJPacket Ordinary',
  NO: 'CJPacket Ordinary', DK: 'CJPacket Ordinary',
  // Oceania
  AU: 'CJPacket Ordinary', NZ: 'CJPacket Ordinary',
  // Asia
  JP: 'CJPacket Ordinary', SG: 'CJPacket Ordinary', IN: 'CJPacket Ordinary',
  // South America
  BR: 'CJPacket Ordinary',
}
const CJ_LOGISTIC_DEFAULT = 'CJPacket Ordinary'

/**
 * Fetches available CJ shipping options for a country, picks the cheapest+fastest,
 * and falls back to a hardcoded known-good logistic name if the API returns nothing.
 */
export async function getBestCJLogisticName(destCountry: string, productWeight = 300): Promise<string> {
  try {
    const data = await getCJShippingInfo({ startCountryCode: 'CN', endCountryCode: destCountry, productWeight, quantity: 1 })
    const options: Array<{ logisticName: string; logisticPrice: number; agingMax?: number; agingMin?: number }> =
      (data.result && Array.isArray(data.data)) ? data.data : []
    if (options.length > 0) {
      const maxPrice = Math.max(...options.map(o => o.logisticPrice))
      const maxDays  = Math.max(...options.map(o => o.agingMax ?? o.agingMin ?? 30))
      const best = options
        .map(o => ({ ...o, score: (o.logisticPrice / (maxPrice || 1)) * 0.7 + ((o.agingMax ?? o.agingMin ?? 30) / (maxDays || 1)) * 0.3 }))
        .sort((a, b) => a.score - b.score)[0]
      return best.logisticName
    }
  } catch (e) {
    console.warn(`getBestCJLogisticName: API call failed for ${destCountry}:`, e)
  }
  // Fallback to known-good hardcoded name
  const fallback = CJ_LOGISTIC_FALLBACK[destCountry] ?? CJ_LOGISTIC_DEFAULT
  console.log(`getBestCJLogisticName: using fallback "${fallback}" for ${destCountry}`)
  return fallback
}

export async function getCJOrderDetail(cjOrderId: string) {
  const data = await cjFetch(`/shopping/order/getOrderDetail?orderId=${cjOrderId}`)
  return data
}
