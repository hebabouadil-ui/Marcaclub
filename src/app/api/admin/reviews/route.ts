import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { connectDB } from '@/lib/db'
import Review from '@/lib/models/Review'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const reviews = await Review.find().sort({ createdAt: -1 }).lean()
  return NextResponse.json(reviews)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const body = await req.json()
  const { productId, author, location, rating, title, body: reviewBody, photo, verified, date } = body
  if (!productId || !author || !rating || !reviewBody) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const review = await Review.create({
    productId,
    author,
    location,
    rating: Number(rating),
    title,
    body: reviewBody,
    photo,
    verified: verified !== false,
    date: date ? new Date(date) : new Date(),
  })
  return NextResponse.json(review)
}
