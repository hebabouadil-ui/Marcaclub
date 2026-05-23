import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
// Revalidate every 6 hours so Vercel caches it at the edge
export const revalidate = 21600

// Hardcoded fallback rates (USD base, updated periodically)
const FALLBACK: Record<string, number> = {
  USD: 1, CAD: 1.36, EUR: 0.92, GBP: 0.79, AUD: 1.53, CHF: 0.90,
  JPY: 149.5, AED: 3.67, SAR: 3.75, MAD: 10.05, BRL: 4.97,
  MXN: 17.2, INR: 83.1, SGD: 1.34, NZD: 1.63,
}

export async function GET() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 21600 },
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    if (data.result !== 'success' || !data.rates) throw new Error('Bad response')
    return NextResponse.json({ rates: data.rates })
  } catch {
    return NextResponse.json({ rates: FALLBACK })
  }
}
