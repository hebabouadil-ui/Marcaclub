import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
  try {
    const body = await req.json()
    const { items, currency = 'usd' } = body

    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: 'No items' }, { status: 400 })

    await connectDB()

    let total = 0
    for (const item of items) {
      const product = await Product.findById(item.productId).lean() as { price: number } | null
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 400 })
      total += product.price * item.quantity
    }

    const amountInCents = Math.round(total * 100)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: { items: JSON.stringify(items) },
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, amount: amountInCents })
  } catch (err) {
    console.error('create-payment-intent error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
