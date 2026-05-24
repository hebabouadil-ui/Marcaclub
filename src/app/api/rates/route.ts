import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
// Revalidate every 6 hours so Vercel caches it at the edge
export const revalidate = 21600

// Fallback rates relative to MAD (1 MAD = X units of currency)
const FALLBACK_MAD: Record<string, number> = {
  MAD: 1, USD: 0.0995, CAD: 0.135, EUR: 0.0916, GBP: 0.0786,
  AUD: 0.152, CHF: 0.0895, JPY: 14.87, AED: 0.365, SAR: 0.373,
  BRL: 0.494, MXN: 1.71, INR: 8.27, SGD: 0.133, NZD: 0.162,
}

function usdToMadRates(usdRates: Record<string, number>): Record<string, number> {
  const madPerUsd = usdRates['MAD'] ?? 10.05
  const result: Record<string, number> = {}
  for (const [code, rate] of Object.entries(usdRates)) {
    result[code] = rate / madPerUsd  // 1 MAD = rate/madPerUsd units of code
  }
  return result
}

export async function GET() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 21600 },
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    if (data.result !== 'success' || !data.rates) throw new Error('Bad response')
    return NextResponse.json({ rates: usdToMadRates(data.rates) })
  } catch {
    return NextResponse.json({ rates: FALLBACK_MAD })
  }
}
