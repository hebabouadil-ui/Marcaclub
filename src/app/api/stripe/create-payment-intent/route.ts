import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import Settings from '@/lib/models/Settings'
import { getCadRates } from '@/lib/utils/getRates'

export const dynamic = 'force-dynamic'

// Currencies Stripe supports that use zero-decimal amounts
const ZERO_DECIMAL = new Set(['jpy', 'krw', 'bif', 'clp', 'gnf', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'xaf', 'xof'])

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
  try {
    const body = await req.json()
    // currency: ISO code the customer selected (e.g. 'usd', 'eur', 'cad')
    // fxRate: CAD → selected currency conversion rate (server-computed below)
    const { items, currency = 'usd', taxRate = 0 } = body

    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: 'No items' }, { status: 400 })

    const currencyLower = String(currency).toLowerCase()

    // Validate currency is supported
    const SUPPORTED = ['usd','cad','eur','gbp','aud','chf','jpy','aed','sar','brl','mxn','inr','sgd','nzd']
    if (!SUPPORTED.includes(currencyLower))
      return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 })

    await connectDB()

    // Fetch live exchange rates server-side to avoid trusting client-provided rates
    let fxRate = 1 // CAD → target currency
    if (currencyLower !== 'cad') {
      const rates = await getCadRates()
      fxRate = rates[currencyLower.toUpperCase()] ?? 1
    }

    // Sum CAD subtotal server-side from DB prices (never trust client prices)
    let subtotalCAD = 0
    for (const item of items) {
      const product = await Product.findById(item.productId).lean() as { price: number } | null
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 400 })
      subtotalCAD += product.price * item.quantity
    }

    // Read shipping fee from Settings (in CAD)
    const settings = await Settings.findOne().lean() as { shippingFeeCAD?: number } | null
    const shippingFeeCAD = settings?.shippingFeeCAD ?? 14.99

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
      automatic_payment_methods: { enabled: true },
      metadata: {
        items: JSON.stringify(items),
        taxRate: String(clampedRate),
        taxAmount: String(taxAmount),
        shippingFee: String(shippingFee),
        fxRate: String(fxRate),
        displayCurrency: currencyLower.toUpperCase(),
      },
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, amount: amountInCents, taxAmount, shippingFee, subtotal, fxRate, currency: currencyLower })
  } catch (err) {
    console.error('create-payment-intent error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
