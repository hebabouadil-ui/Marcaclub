import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { confirm } = await req.json()
  if (confirm !== 'DELETE_ALL_ORDERS') {
    return NextResponse.json({ error: 'Missing confirmation' }, { status: 400 })
  }

  await connectDB()
  const result = await Order.deleteMany({})
  return NextResponse.json({ deleted: result.deletedCount })
}
