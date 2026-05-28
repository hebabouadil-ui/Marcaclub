import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectDB } from '@/lib/db'
import Review from '@/lib/models/Review'
import Order from '@/lib/models/Order'

export const dynamic = 'force-dynamic'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

async function getCustomerFromReq(req: NextRequest) {
  try {
    const token = req.cookies.get('mc-customer')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, SECRET)
    return { id: payload.sub as string, email: payload.email as string, name: payload.name as string }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest, { params }: { params: { productId: string } }) {
  await connectDB()
  const { productId } = params
  const check = req.nextUrl.searchParams.get('check')

  if (check === '1') {
    const customer = await getCustomerFromReq(req)
    if (!customer) return NextResponse.json({ canReview: false, reason: 'not_logged_in' })
    // Check delivered order
    const order = await Order.findOne({
      'customer.email': customer.email,
      status: 'delivered',
      'items.productId': productId,
    })
    if (!order) return NextResponse.json({ canReview: false, reason: 'not_a_buyer' })
    // Check no existing review
    const existing = await Review.findOne({ productId, customerId: customer.id })
    if (existing) return NextResponse.json({ canReview: false, reason: 'already_reviewed' })
    return NextResponse.json({ canReview: true })
  }

  const reviews = await Review.find({ productId }).sort({ date: -1 }).lean()
  return NextResponse.json(reviews)
}

export async function POST(req: NextRequest, { params }: { params: { productId: string } }) {
  const customer = await getCustomerFromReq(req)
  if (!customer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await connectDB()
  const { productId } = params

  // Must have a delivered order with this product
  const order = await Order.findOne({
    'customer.email': customer.email,
    status: 'delivered',
    'items.productId': productId,
  })
  if (!order) {
    return NextResponse.json({ error: 'not_a_buyer' }, { status: 403 })
  }

  // No duplicate
  const existing = await Review.findOne({ productId, customerId: customer.id })
  if (existing) {
    return NextResponse.json({ error: 'already_reviewed' }, { status: 403 })
  }

  const { author, rating, title, body } = await req.json()
  if (!rating || !body) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (typeof body !== 'string' || body.length > 2000) {
    return NextResponse.json({ error: 'Review body invalid' }, { status: 400 })
  }
  if (title && (typeof title !== 'string' || title.length > 200)) {
    return NextResponse.json({ error: 'Title invalid' }, { status: 400 })
  }
  const ratingNum = Number(rating)
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
  }
  // Strip HTML tags to prevent stored XSS
  const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').trim()

  const review = await Review.create({
    productId,
    customerId: customer.id,
    author: stripHtml(author || customer.name).slice(0, 100),
    rating: ratingNum,
    title: title ? stripHtml(title) : undefined,
    body: stripHtml(body),
    verified: true,
    date: new Date(),
  })

  return NextResponse.json(review, { status: 201 })
}
