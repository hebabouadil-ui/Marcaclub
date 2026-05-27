import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { connectDB } from '@/lib/db'
import Customer from '@/lib/models/Customer'

export const dynamic = 'force-dynamic'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = await req.json()
    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    await connectDB()
    const existing = await Customer.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }
    const passwordHash = await bcrypt.hash(password, 12)
    const customer = await Customer.create({ name, email: email.toLowerCase(), passwordHash })
    const customerId = String(customer._id)
    const token = await new SignJWT({ sub: customerId, email: customer.email, name: customer.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(SECRET)
    const res = NextResponse.json({ _id: customerId, email: customer.email, name: customer.name })
    res.cookies.set('mc-customer', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (err) {
    console.error('register error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
