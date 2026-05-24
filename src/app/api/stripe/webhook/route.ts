import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import Product from '@/lib/models/Product'
import { createCJOrder } from '@/lib/utils/cjApi'
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from '@/lib/utils/email'

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
    const order = await Order.findOneAndUpdate(
      { stripePaymentIntentId: pi.id },
      { stripePaymentStatus: 'paid', status: 'confirmed' },
      { new: true }
    )

    if (order) {
      // Send confirmation emails
      sendOrderConfirmationEmail(order).catch(e => console.error('Confirmation email failed:', e))
      sendAdminOrderNotification(order).catch(e => console.error('Admin notification failed:', e))
    }

    // Auto-forward to CJ Dropshipping if order has CJ products
    if (order && !order.cjOrderId) {
      try {
        const cjProducts: { vid: string; quantity: number }[] = []
        for (const item of order.items) {
          const product = await Product.findById(item.productId).lean() as {
            cjPid?: string
            sizes?: Array<{ size: string; cjVid?: string }>
          } | null
          if (!product?.cjPid) continue
          const sizeEntry = product.sizes?.find((s) => s.size === item.size)
          if (!sizeEntry?.cjVid) continue
          cjProducts.push({ vid: sizeEntry.cjVid, quantity: item.quantity })
        }

        if (cjProducts.length > 0) {
          const nameParts = order.customer.name.trim().split(' ')
          const firstName = nameParts[0]
          const lastName = nameParts.slice(1).join(' ') || firstName

          const cjRes = await createCJOrder({
            orderNumber: order.orderNumber,
            shippingAddress: {
              firstName,
              lastName,
              phone: order.customer.phone,
              email: order.customer.email ?? '',
              country: order.customer.country ?? 'US',
              province: order.customer.state ?? '',
              city: order.customer.city,
              address: order.customer.address,
              zip: order.customer.postalCode ?? '',
            },
            products: cjProducts,
          })

          if (cjRes.result && cjRes.data?.orderId) {
            await Order.findByIdAndUpdate(order._id, { cjOrderId: cjRes.data.orderId })
          }
        }
      } catch (err) {
        console.error('Auto CJ order forward error:', err)
      }
    }
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
