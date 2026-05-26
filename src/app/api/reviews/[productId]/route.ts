import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Review from '@/lib/models/Review'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  await connectDB()
  const reviews = await Review.find({ productId: params.productId }).sort({ date: -1 }).lean()
  return NextResponse.json(reviews)
}
