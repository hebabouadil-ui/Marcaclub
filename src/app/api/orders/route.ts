import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import { generateOrderNumber } from '@/lib/utils/generateOrderNumber'
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from '@/lib/utils/email'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const query = status ? { status } : {}
    const orders = await Order.find(query).sort({ createdAt: -1 }).lean()
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
    const emailPromises = []
    if (body.customer?.email) {
      emailPromises.push(sendOrderConfirmationEmail(order).catch((err) => console.error('Customer email error:', err)))
    }
    emailPromises.push(sendAdminOrderNotification(order).catch((err) => console.error('Admin email error:', err)))
    await Promise.all(emailPromises)

    return NextResponse.json({ orderNumber, orderId: order._id }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}
