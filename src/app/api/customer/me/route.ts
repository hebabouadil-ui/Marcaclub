import { NextResponse } from 'next/server'
import { getCustomerSession, CUSTOMER_COOKIE } from '@/lib/utils/customerAuth'
import { connectDB } from '@/lib/db'
import Customer from '@/lib/models/Customer'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getCustomerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await connectDB()
  const customer = await Customer.findById(session.id).select('-passwordHash').lean()
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(customer)
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(CUSTOMER_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
