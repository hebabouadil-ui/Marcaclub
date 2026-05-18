import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import Product from '@/lib/models/Product'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { sendOrderStatusEmail } from '@/lib/utils/email'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const order = await Order.findById(params.id).lean()
    if (!order) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(order)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const { status } = await req.json()
    const order = await Order.findById(params.id)
    if (!order) return NextResponse.json({ message: 'Not found' }, { status: 404 })

    const previousStatus = order.status
    order.status = status
    await order.save()

    // Restore stock when cancelling, re-deduct if un-cancelling
    if (status === 'cancelled' && previousStatus !== 'cancelled') {
      await Promise.all(
        order.items.map((item: { productId: string; quantity: number }) =>
          Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } })
        )
      )
    } else if (previousStatus === 'cancelled' && status !== 'cancelled') {
      await Promise.all(
        order.items.map((item: { productId: string; quantity: number }) =>
          Product.updateOne({ _id: item.productId }, { $inc: { stock: -item.quantity } })
        )
      )
    }

    sendOrderStatusEmail(order, status).catch(console.error)
    return NextResponse.json(order.toObject())
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
