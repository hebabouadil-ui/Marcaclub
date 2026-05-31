import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import Coupon from '@/lib/models/Coupon'
import { getCadRates } from '@/lib/utils/getRates'
import { computeShippingUSD } from '@/lib/utils/computeShipping'

export const dynamic = 'force-dynamic'

// Currencies Stripe supports that use zero-decimal amounts
const ZERO_DECIMAL = new Set(['jpy', 'krw', 'bif', 'clp', 'gnf', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'xaf', 'xof'])

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
  try {
    const body = await req.json()
    const { items, currency = 'cad', taxRate = 0, country = 'CA', couponCode, storeCreditCAD = 0, customerEmail } = body

    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: 'No items' }, { status: 400 })

    const currencyLower = String(currency).toLowerCase()

    // Validate currency is supported
    const SUPPORTED = ['usd','cad','eur','gbp','aud','chf','jpy','aed','sar','brl','mxn','inr','sgd','nzd']
    if (!SUPPORTED.includes(currencyLower))
      return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 })

    await connectDB()

    // Fetch live exchange rates server-side
    let fxRate = 1 // CAD → target currency
    const rates = await getCadRates()
    if (currencyLower !== 'cad') {
      fxRate = rates[currencyLower.toUpperCase()] ?? 1
    }

    // usdToCAD for shipping calculation
    const usdToCAD = 1 / (rates['USD'] ?? 0.73)

    // Sum CAD subtotal — mirror client price resolution: variantPrice ?? product.price
    let subtotalCAD = 0
    const resolvedItems: Array<{ productId: string; size: string; unitPrice: number; source: string }> = []
    for (const item of items) {
      const product = await Product.findById(item.productId).lean() as {
        price: number
        sizes?: Array<{ size: string; variantPrice?: number }>
      } | null
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 400 })
      const matchedSize = product.sizes?.find((s) => s.size === item.size)
      const unitPrice = matchedSize?.variantPrice ?? product.price
      const source = matchedSize?.variantPrice != null ? 'variantPrice' : 'product.price'
      resolvedItems.push({ productId: String(item.productId), size: item.size, unitPrice, source })
      subtotalCAD += unitPrice * item.quantity
    }

    // Shipping: SINGLE SOURCE OF TRUTH — identical function, CJ request, option
    // selection and base USD value as /api/shipping-estimate (product + cart pages).
    // Convert USD → CAD with the same usdToCAD and rounding so the value matches exactly.
    const shippingResult = await computeShippingUSD(
      items.map((i: { productId: string; size: string; quantity: number }) => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
      country,
      usdToCAD,
    )
    const shippingFeeCAD = Math.round(shippingResult.shippingUSD * usdToCAD * 100) / 100

    const subtotal = Math.round(subtotalCAD * fxRate * 100) / 100
    const shippingFee = Math.round(shippingFeeCAD * fxRate * 100) / 100

    // Clamp taxRate to 0–50% to prevent abuse
    const clampedRate = Math.min(Math.max(Number(taxRate) || 0, 0), 0.5)
    const taxAmount = Math.round(subtotal * clampedRate * 100) / 100

    // Validate coupon server-side
    let discountAmountCAD = 0
    let validatedCoupon: { code: string; type: 'percent' | 'fixed'; value: number } | null = null
    if (couponCode && typeof couponCode === 'string') {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() }).lean() as {
        code: string; type: 'percent' | 'fixed'; value: number; active: boolean
        expiresAt?: Date; usageLimit?: number; usageCount: number
        minOrderAmount?: number; onePerCustomer: boolean; usedByCustomers: string[]
      } | null
      if (
        coupon && coupon.active &&
        (!coupon.expiresAt || new Date() <= new Date(coupon.expiresAt)) &&
        (coupon.usageLimit == null || coupon.usageCount < coupon.usageLimit) &&
        (!coupon.minOrderAmount || subtotalCAD >= coupon.minOrderAmount) &&
        (!coupon.onePerCustomer || !customerEmail || !coupon.usedByCustomers.includes(String(customerEmail).toLowerCase()))
      ) {
        discountAmountCAD = coupon.type === 'percent'
          ? Math.round(subtotalCAD * (coupon.value / 100) * 100) / 100
          : Math.min(coupon.value, subtotalCAD)
        validatedCoupon = { code: coupon.code, type: coupon.type, value: coupon.value }
      }
    }

    // Apply store credit (capped at remaining total after coupon, must be >= 0)
    const clampedStoreCreditCAD = Math.max(0, Math.min(Number(storeCreditCAD) || 0, subtotalCAD + (shippingFeeCAD / fxRate) - discountAmountCAD))
    const discountDisplay = Math.round(discountAmountCAD * fxRate * 100) / 100
    const storeCreditDisplay = Math.round(clampedStoreCreditCAD * fxRate * 100) / 100

    const total = Math.max(0.50, subtotal + shippingFee + taxAmount - discountDisplay - storeCreditDisplay)

    const isZeroDecimal = ZERO_DECIMAL.has(currencyLower)
    const amountInCents = isZeroDecimal ? Math.round(total) : Math.round(total * 100)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currencyLower,
      payment_method_types: ['card'],
      metadata: {
        items: JSON.stringify(items),
        taxRate: String(clampedRate),
        taxAmount: String(taxAmount),
        shippingFee: String(shippingFee),
        shippingFeeCAD: String(shippingFeeCAD),
        country: String(country).toUpperCase(),
        fxRate: String(fxRate),
        displayCurrency: currencyLower.toUpperCase(),
        couponCode: validatedCoupon?.code ?? '',
        discountAmount: String(discountDisplay),
        storeCreditUsed: String(storeCreditDisplay),
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: amountInCents,
      taxAmount,
      shippingFee,
      shippingFeeCAD,
      subtotal,
      fxRate,
      currency: currencyLower,
      couponCode: validatedCoupon?.code ?? null,
      discountAmount: discountDisplay,
      storeCreditApplied: storeCreditDisplay,
      debug: { resolvedItems, subtotalCAD },
    })
  } catch (err) {
    console.error('create-payment-intent error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
