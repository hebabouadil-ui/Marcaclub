import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/admin/auth/[...nextauth]/authOptions'

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
    const order = await Order.findByIdAndUpdate(params.id, { status }, { new: true }).lean()
    if (!order) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(order)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
