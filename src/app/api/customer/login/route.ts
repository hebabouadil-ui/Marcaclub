import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import Customer from '@/lib/models/Customer'
import { signCustomerToken, CUSTOMER_COOKIE } from '@/lib/utils/customerAuth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    await connectDB()
    const customer = await Customer.findOne({ email: email.toLowerCase() })
    if (!customer) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

    const valid = await bcrypt.compare(password, customer.passwordHash)
    if (!valid) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

    const token = await signCustomerToken({ id: String(customer._id), email: customer.email, name: customer.name })
    const res = NextResponse.json({ success: true, name: customer.name, email: customer.email })
    res.cookies.set(CUSTOMER_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' })
    return res
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
