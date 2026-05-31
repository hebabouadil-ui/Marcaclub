import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { connectDB } from '@/lib/db'
import Customer from '@/lib/models/Customer'

export const dynamic = 'force-dynamic'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

export async function POST(req: NextRequest) {
  try {
    const { credential } = await req.json()
    if (!credential) return NextResponse.json({ error: 'Missing credential' }, { status: 400 })

    // Verify the Google ID token via Google's tokeninfo endpoint
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`)
    if (!verifyRes.ok) return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 })

    const gPayload = await verifyRes.json()

    // Validate audience matches our client ID
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (clientId && gPayload.aud !== clientId) {
      return NextResponse.json({ error: 'Token audience mismatch' }, { status: 401 })
    }

    const { sub: googleId, email, name, email_verified } = gPayload
    if (!email || !googleId) return NextResponse.json({ error: 'Missing Google profile' }, { status: 400 })

    await connectDB()

    // Find existing customer by googleId or email
    let customer = await Customer.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] })

    if (!customer) {
      // Create new customer — Google-verified emails skip email verification
      customer = await Customer.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        googleId,
        emailVerified: email_verified === 'true' || email_verified === true,
      })
    } else {
      // Link googleId if signing in via Google for the first time
      if (!customer.googleId) {
        await Customer.updateOne({ _id: customer._id }, { $set: { googleId, emailVerified: true } })
        customer.googleId = googleId
        customer.emailVerified = true
      }
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
    console.error('Google token error', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
