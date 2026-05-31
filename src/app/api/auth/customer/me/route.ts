import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectDB } from '@/lib/db'
import Customer from '@/lib/models/Customer'

export const dynamic = 'force-dynamic'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('mc-customer')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { payload } = await jwtVerify(token, SECRET)
    const customerId = payload.sub
    if (!customerId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    await connectDB()
    const customer = await Customer.findById(customerId).select('name email storeCredit referralCode').lean() as {
      _id: unknown
      name: string
      email: string
      storeCredit: number
      referralCode?: string
    } | null

    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
      _id: String(customer._id),
      name: customer.name,
      email: customer.email,
      storeCredit: customer.storeCredit ?? 0,
      referralCode: customer.referralCode ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
