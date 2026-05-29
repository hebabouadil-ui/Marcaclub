import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId, description, descriptionEn } = await req.json()
  if (!productId || !description) return NextResponse.json({ error: 'productId and description required' }, { status: 400 })

  if (!mongoose.isValidObjectId(productId)) {
    return NextResponse.json({ error: 'Invalid productId' }, { status: 400 })
  }

  await connectDB()

  // ONLY $set on allowed fields — never replaceOne, never touch CJ fields
  await Product.updateOne(
    { _id: productId },
    { $set: { description, ...(descriptionEn ? { descriptionEn } : {}) } }
  )

  return NextResponse.json({ ok: true })
}
