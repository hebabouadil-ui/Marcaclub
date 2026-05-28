import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  // Require explicit confirmation token to prevent accidental data loss
  const { confirm } = await req.json().catch(() => ({}))
  if (confirm !== 'DELETE_ALL_ORDERS') {
    return NextResponse.json({ message: 'Confirmation required: send { confirm: "DELETE_ALL_ORDERS" }' }, { status: 400 })
  }

  await connectDB()
  const result = await Order.deleteMany({})
  return NextResponse.json({ deleted: result.deletedCount })
}
