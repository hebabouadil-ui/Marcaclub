import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(req.url)
    const query: Record<string, unknown> = {}
    // Only admins can request inactive products
    if (!searchParams.get('all') || !session) query.active = true
    if (searchParams.get('category')) query.category = searchParams.get('category')
    if (searchParams.get('featured')) query.featured = true
    if (searchParams.get('q')) query.name = { $regex: searchParams.get('q'), $options: 'i' }
    const products = await Product.find(query).sort({ createdAt: -1 }).lean()
    const normalized = products.map((p) => ({
      ...p,
      sizes: (p.sizes as unknown[]).map((s) =>
        typeof s === 'string' ? { size: s, stock: 0 } : s
      ),
    }))
    return NextResponse.json(normalized)
  } catch (err) {
    console.error('GET /api/products error:', err)
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const body = await req.json()
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      + '-' + Date.now()
    const totalStock = Array.isArray(body.sizes) ? body.sizes.reduce((s: number, i: { stock: number }) => s + i.stock, 0) : 0
    const product = await Product.create({ ...body, slug, stock: totalStock })
    return NextResponse.json(product, { status: 201 })
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}
