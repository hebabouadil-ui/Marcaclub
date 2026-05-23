import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    await connectDB()
    await Order.findOneAndUpdate(
      { stripePaymentIntentId: pi.id },
      { stripePaymentStatus: 'paid', status: 'confirmed' }
    )
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent
    await connectDB()
    await Order.findOneAndUpdate(
      { stripePaymentIntentId: pi.id },
      { stripePaymentStatus: 'failed', status: 'cancelled' }
    )
  }

  return NextResponse.json({ received: true })
}

export const dynamic = 'force-dynamic'
