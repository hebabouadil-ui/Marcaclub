import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import Customer from '@/lib/models/Customer'
import { signCustomerToken, CUSTOMER_COOKIE } from '@/lib/utils/customerAuth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const base = (process.env.NEXTAUTH_URL ?? 'https://marca-club.com').replace(/\/$/, '')

  if (!code) {
    return NextResponse.redirect(new URL('/account/login?error=oauth_denied', req.url))
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${base}/api/customer/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokens.access_token) throw new Error('No access token from Google')

    // Get user profile
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const gUser = await userRes.json()
    if (!gUser.email) throw new Error('No email from Google')

    // Find or create customer
    await connectDB()
    let customer = await Customer.findOne({ email: gUser.email.toLowerCase() })
    if (!customer) {
      const passwordHash = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10)
      customer = await Customer.create({
        name: gUser.name ?? gUser.email.split('@')[0],
        email: gUser.email.toLowerCase(),
        passwordHash,
        googleId: gUser.sub,
      })
    } else if (!customer.googleId) {
      customer.googleId = gUser.sub
      await customer.save()
    }

    const token = await signCustomerToken({ id: String(customer._id), email: customer.email, name: customer.name })
    const returnTo = state ? decodeURIComponent(state) : '/'
    const res = NextResponse.redirect(new URL(returnTo, req.url))
    res.cookies.set(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return res
  } catch (err) {
    console.error('Google OAuth error:', err)
    return NextResponse.redirect(new URL('/account/login?error=oauth_failed', req.url))
  }
}
