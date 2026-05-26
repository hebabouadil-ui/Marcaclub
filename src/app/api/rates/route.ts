import { NextResponse } from 'next/server'

// Revalidate every 6 hours so Vercel caches it at the edge
export const revalidate = 21600

// Fallback rates relative to CAD (1 CAD = X units of currency)
const FALLBACK_CAD: Record<string, number> = {
  CAD: 1, USD: 0.73, EUR: 0.68, GBP: 0.58, AUD: 1.10,
  CHF: 0.66, JPY: 108, AED: 2.68, SAR: 2.74, BRL: 3.65,
  MXN: 12.6, INR: 61.0, SGD: 0.98, NZD: 1.20,
}

function usdRatesToCadRates(usdRates: Record<string, number>): Record<string, number> {
  const usdToCad = usdRates['CAD'] ?? 1.38
  const result: Record<string, number> = { CAD: 1 }
  for (const [code, rate] of Object.entries(usdRates)) {
    if (code !== 'CAD') result[code] = rate / usdToCad
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
    return NextResponse.json({ rates: usdRatesToCadRates(data.rates) })
  } catch {
    return NextResponse.json({ rates: FALLBACK_CAD })
  }
}
