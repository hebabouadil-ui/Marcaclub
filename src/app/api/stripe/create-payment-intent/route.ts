import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import { getCadRates } from '@/lib/utils/getRates'
import { computeShippingUSD } from '@/lib/utils/computeShipping'

export const dynamic = 'force-dynamic'

// Currencies Stripe supports that use zero-decimal amounts
const ZERO_DECIMAL = new Set(['jpy', 'krw', 'bif', 'clp', 'gnf', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'xaf', 'xof'])

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
  try {
    const body = await req.json()
    const { items, currency = 'cad', taxRate = 0, country = 'CA' } = body

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

    // Sum CAD subtotal
    let subtotalCAD = 0
    for (const item of items) {
      const product = await Product.findById(item.productId).lean() as { price: number } | null
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 400 })
      subtotalCAD += product.price * item.quantity
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
    const total = subtotal + shippingFee + taxAmount

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
      },
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, amount: amountInCents, taxAmount, shippingFee, shippingFeeCAD, subtotal, fxRate, currency: currencyLower })
  } catch (err) {
    console.error('create-payment-intent error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
