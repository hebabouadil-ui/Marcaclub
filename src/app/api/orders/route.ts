import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import Product from '@/lib/models/Product'
import Settings from '@/lib/models/Settings'
import { generateOrderNumber } from '@/lib/utils/generateOrderNumber'
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from '@/lib/utils/email'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const orders = await Order.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json(orders)
  } catch (err) {
    console.error('GET /api/orders error:', err)
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()
    const orderNumber = generateOrderNumber()
    const order = await Order.create({ ...body, orderNumber })

    // Decrement per-size stock for each ordered item
    if (Array.isArray(body.items)) {
      await Promise.all(
        body.items.map((item: { productId: string; size: string; quantity: number }) =>
          Product.updateOne({ _id: item.productId }, [
            {
              $set: {
                sizes: {
                  $map: {
                    input: '$sizes', as: 'sz',
                    in: {
                      $cond: [
                        { $eq: ['$$sz.size', item.size] },
                        { size: '$$sz.size', stock: { $max: [0, { $subtract: ['$$sz.stock', item.quantity] }] } },
                        '$$sz'
                      ]
                    }
                  }
                }
              }
            },
            { $set: { stock: { $sum: '$sizes.stock' } } }
          ])
        )
      )
    }

    const settings = await Settings.findOne().lean() as { emailNote?: string } | null
    const emailNote = settings?.emailNote

    const emailPromises = []
    if (body.customer?.email) {
      emailPromises.push(sendOrderConfirmationEmail(order, emailNote).catch((err) => console.error('Customer email error:', err)))
    }
    emailPromises.push(sendAdminOrderNotification(order).catch((err) => console.error('Admin email error:', err)))
    await Promise.all(emailPromises)

    return NextResponse.json({ orderNumber, orderId: order._id }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}
