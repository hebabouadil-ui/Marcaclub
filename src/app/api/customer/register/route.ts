import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import Customer from '@/lib/models/Customer'
import { signCustomerToken, CUSTOMER_COOKIE } from '@/lib/utils/customerAuth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, country } = await req.json()
    if (!name || !email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })

    await connectDB()
    const existing = await Customer.findOne({ email: email.toLowerCase() })
    if (existing) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })

    const passwordHash = await bcrypt.hash(password, 12)
    const customer = await Customer.create({ name, email: email.toLowerCase(), passwordHash, phone, country })

    const token = await signCustomerToken({ id: String(customer._id), email: customer.email, name: customer.name })
    const res = NextResponse.json({ success: true, name: customer.name, email: customer.email })
    res.cookies.set(CUSTOMER_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' })
    return res
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
