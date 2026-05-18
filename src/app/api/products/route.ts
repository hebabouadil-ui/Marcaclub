import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const query: Record<string, unknown> = {}
    if (!searchParams.get('all')) query.active = true
    if (searchParams.get('category')) query.category = searchParams.get('category')
    if (searchParams.get('featured')) query.featured = true
    if (searchParams.get('q')) query.name = { $regex: searchParams.get('q'), $options: 'i' }
    const products = await Product.find(query).sort({ createdAt: -1 }).lean()
    return NextResponse.json(products)
  } catch (err) {
    console.error('GET /api/products error:', err)
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      + '-' + Date.now()
    const product = await Product.create({ ...body, slug })
    return NextResponse.json(product, { status: 201 })
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}
