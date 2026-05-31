import { NextRequest, NextResponse } from 'next/server'
import { getCadRates } from '@/lib/utils/getRates'
import { computeShippingUSD } from '@/lib/utils/computeShipping'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { items, country } = await req.json()
    if (!Array.isArray(items) || !country) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const rates = await getCadRates()
    const usdToCAD = 1 / (rates['USD'] ?? 0.73)

    // SINGLE SOURCE OF TRUTH — same function the payment intent uses.
    const result = await computeShippingUSD(items, country, usdToCAD)

    const shippingFeeUSD = Math.round(result.shippingUSD * 100) / 100
    const shippingFeeCAD = Math.round(result.shippingUSD * usdToCAD * 100) / 100

    return NextResponse.json({
      shippingFeeUSD,
      shippingFeeCAD,
      agingMin: result.agingMin,
      agingMax: result.agingMax,
      logisticName: result.logisticName,
      source: result.source,
    })
  } catch (err) {
    console.error('shipping-estimate error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
