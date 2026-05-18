import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const product = await Product.findById(params.id).lean()
    if (!product) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(product)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const body = await req.json()
    const product = await Product.findById(params.id)
    if (!product) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    const fields = ['name', 'price', 'originalPrice', 'category', 'description', 'images', 'sizes', 'featured', 'active']
    for (const field of fields) {
      if (body[field] !== undefined) (product as Record<string, unknown>)[field] = body[field]
    }
    product.stock = Array.isArray(product.sizes)
      ? product.sizes.reduce((s: number, i: { stock: number }) => s + (i.stock || 0), 0)
      : 0
    await product.save()
    return NextResponse.json(product.toObject())
  } catch (err) {
    console.error('PUT /api/products/[id] error:', err)
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    await Product.findByIdAndDelete(params.id)
    return NextResponse.json({ message: 'Deleted' })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
