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
  productWeight: number
  quantity: number
  vid?: string
  variantSku?: string
}) {
  const data = await cjFetch('/logistic/freightCalculate', {
    method: 'POST',
    body: JSON.stringify({
      startCountryCode: params.startCountryCode,
      endCountryCode: params.endCountryCode,
      products: [{
        quantity: params.quantity,
        weight: params.productWeight,
        ...(params.vid ? { vid: params.vid } : {}),
        ...(params.variantSku ? { variantSku: params.variantSku } : {}),
      }],
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

export async function getCJOrderDetail(cjOrderId: string) {
  const data = await cjFetch(`/shopping/order/getOrderDetail?orderId=${cjOrderId}`)
  return data
}
