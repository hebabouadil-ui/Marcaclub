import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { connectDB } from '@/lib/db'
import Customer from '@/lib/models/Customer'

export const dynamic = 'force-dynamic'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    await connectDB()
    const customer = await Customer.findOne({ email: email.toLowerCase() })
    if (!customer) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    if (!customer.passwordHash) {
      return NextResponse.json({ error: 'Ce compte utilise la connexion Google. Veuillez vous connecter avec Google.' }, { status: 401 })
    }
    const valid = await bcrypt.compare(password, customer.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    if (!customer.emailVerified) {
      return NextResponse.json({ error: 'Veuillez activer votre compte. Vérifiez votre boîte mail.' }, { status: 403 })
    }
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
    console.error('login error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
