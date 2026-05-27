import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import { getCJShippingInfo } from '@/lib/utils/cjApi'
import { getShippingFeeCAD } from '@/lib/utils/shippingFee'
import { getCadRates } from '@/lib/utils/getRates'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { items, country } = await req.json()
    if (!Array.isArray(items) || !country) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const rates = await getCadRates()
    const usdToCAD = 1 / (rates['USD'] ?? 0.73)
    const destCountry = String(country).toUpperCase()

    await connectDB()

    // Collect real CJ VIDs for all cart items
    const cjProducts: Array<{ vid: string; quantity: number }> = []
    for (const item of items) {
      const product = await Product.findById(item.productId).lean() as {
        cjPid?: string
        sizes?: Array<{ size: string; cjVid?: string }>
      } | null
      if (!product?.cjPid) continue
      const sizeEntry = product.sizes?.find(s => s.size === item.size)
      if (sizeEntry?.cjVid) cjProducts.push({ vid: sizeEntry.cjVid, quantity: item.quantity })
    }

    let shippingFeeCAD: number

    if (cjProducts.length > 0) {
      try {
        const cjData = await getCJShippingInfo({
          startCountryCode: 'CN',
          endCountryCode: destCountry,
          products: cjProducts,
        })
        const options: Array<{ logisticPrice: number; agingMax?: number; agingMin?: number }> =
          (cjData.result && Array.isArray(cjData.data)) ? cjData.data : []

        if (options.length > 0) {
          const maxPrice = Math.max(...options.map(o => o.logisticPrice))
          const maxDays  = Math.max(...options.map(o => o.agingMax ?? o.agingMin ?? 30))
          const best = options
            .map(o => ({ ...o, score: (o.logisticPrice / (maxPrice || 1)) * 0.7 + ((o.agingMax ?? o.agingMin ?? 30) / (maxDays || 1)) * 0.3 }))
            .sort((a, b) => a.score - b.score)[0]
          shippingFeeCAD = Math.round(best.logisticPrice * usdToCAD * 100) / 100
        } else {
          shippingFeeCAD = getShippingFeeCAD(destCountry, usdToCAD)
        }
      } catch {
        shippingFeeCAD = getShippingFeeCAD(destCountry, usdToCAD)
      }
    } else {
      shippingFeeCAD = getShippingFeeCAD(destCountry, usdToCAD)
    }

    return NextResponse.json({ shippingFeeCAD })
  } catch (err) {
    console.error('shipping-estimate error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
