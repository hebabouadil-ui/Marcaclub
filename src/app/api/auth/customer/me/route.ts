import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectDB } from '@/lib/db'
import Customer from '@/lib/models/Customer'

export const dynamic = 'force-dynamic'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('mc-customer')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, SECRET)
    const customerId = payload.sub as string
    if (!customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()
    const customer = await Customer.findById(customerId).select('-passwordHash').lean()
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const c = customer as { _id: unknown; name: string; email: string }
    return NextResponse.json({ _id: String(c._id), name: c.name, email: c.email })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
