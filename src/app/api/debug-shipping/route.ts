import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import { cjFetchRaw } from '@/lib/utils/cjApi'
import { getCadRates } from '@/lib/utils/getRates'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { productId, size, quantity, country } = await req.json()
    await connectDB()
    const rates = await getCadRates()
    const usdToCAD = 1 / (rates['USD'] ?? 0.73)
    const dest = String(country ?? 'MA').toUpperCase()

    const product = await Product.findById(productId).lean() as Record<string, unknown> | null
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const sizes = (product.sizes as Array<Record<string, unknown>>) ?? []
    const sizeEntry = sizes.find(s => s.size === size) ?? sizes.find(s => s.cjSku)
    const variantSku = String(sizeEntry?.cjSku ?? '')

    const results: Record<string, unknown> = { variantSku }

    // Test qty=full
    const fullQty = quantity ?? 1
    const r1 = await cjFetchRaw('/logistic/freightCalculate', {
      method: 'POST',
      body: JSON.stringify({
        startCountryCode: 'CN', endCountryCode: dest,
        products: [{ variantSku, quantity: fullQty }],
      }),
    })
    const opts1 = (r1.result && Array.isArray(r1.data)) ? r1.data : []
    results[`qty_${fullQty}`] = { result: r1.result, message: r1.message, optionCount: opts1.length, cheapest: opts1[0] ?? null }

    // Test qty=1
    if (fullQty > 1) {
      await new Promise(r => setTimeout(r, 1100)) // respect 1 req/sec
      const r2 = await cjFetchRaw('/logistic/freightCalculate', {
        method: 'POST',
        body: JSON.stringify({
          startCountryCode: 'CN', endCountryCode: dest,
          products: [{ variantSku, quantity: 1 }],
        }),
      })
      const opts2 = (r2.result && Array.isArray(r2.data)) ? r2.data : []
      results['qty_1'] = { result: r2.result, message: r2.message, optionCount: opts2.length, cheapest: opts2[0] ?? null }
      if (opts2.length > 0) {
        const price = opts2[0].logisticPrice * fullQty
        results['multipacket_estimate'] = { packets: fullQty, priceUSD: price, priceCAD: Math.round(price * usdToCAD * 100) / 100 }
      }
    }

    return NextResponse.json(results)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
