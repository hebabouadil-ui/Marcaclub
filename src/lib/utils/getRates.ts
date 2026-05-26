const FALLBACK_CAD: Record<string, number> = {
  CAD: 1, USD: 0.73, EUR: 0.68, GBP: 0.58, AUD: 1.10,
  CHF: 0.66, JPY: 108, AED: 2.68, SAR: 2.74, BRL: 3.65,
  MXN: 12.6, INR: 61.0, SGD: 0.98, NZD: 1.20,
}

let _cachedRates: Record<string, number> | null = null
let _cacheTime = 0
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

export async function getCadRates(): Promise<Record<string, number>> {
  const now = Date.now()
  if (_cachedRates && now - _cacheTime < CACHE_TTL) return _cachedRates
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    if (data.result !== 'success' || !data.rates) throw new Error('Bad response')
    const usdToCad = data.rates['CAD'] ?? 1.38
    const result: Record<string, number> = { CAD: 1 }
    for (const [code, rate] of Object.entries(data.rates as Record<string, number>)) {
      if (code !== 'CAD') result[code] = rate / usdToCad
    }
    _cachedRates = result
    _cacheTime = now
    return result
  } catch {
    return FALLBACK_CAD
  }
}
