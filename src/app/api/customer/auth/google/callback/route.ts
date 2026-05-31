import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { connectDB } from '@/lib/db'
import Customer from '@/lib/models/Customer'

export const dynamic = 'force-dynamic'

// Uses the SAME cookie name and JWT format as /api/auth/customer/login and /me
// so CustomerContext.refresh() picks up the session after Google redirect.
const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
const MC_COOKIE = 'mc-customer'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const base = (process.env.SITE_URL ?? 'https://marca-club.com').replace(/\/$/, '')

  if (!code) {
    return NextResponse.redirect(new URL('/account/login?error=oauth_denied', req.url))
  }

  try {
    // Exchange authorization code for access token
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

    // Fetch verified profile
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const gUser = await userRes.json()
    if (!gUser.email) throw new Error('No email from Google')

    // Find or create customer — never store a real password for Google accounts
    await connectDB()
    let customer = await Customer.findOne({
      $or: [{ googleId: gUser.sub }, { email: gUser.email.toLowerCase() }],
    })

    if (!customer) {
      customer = await Customer.create({
        name: gUser.name ?? gUser.email.split('@')[0],
        email: gUser.email.toLowerCase(),
        googleId: gUser.sub,
        emailVerified: true,
      })
    } else if (!customer.googleId) {
      await Customer.updateOne({ _id: customer._id }, { $set: { googleId: gUser.sub, emailVerified: true } })
    }

    // Issue mc-customer JWT — identical structure to the login route so /api/auth/customer/me
    // and CustomerContext.refresh() work without any changes.
    const customerId = String(customer._id)
    const jwt = await new SignJWT({ sub: customerId, email: customer.email, name: customer.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(SECRET)

    const returnTo = state ? decodeURIComponent(state) : '/'
    const res = NextResponse.redirect(new URL(returnTo, req.url))
    res.cookies.set(MC_COOKIE, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return res
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    return NextResponse.redirect(new URL('/account/login?error=oauth_failed', req.url))
  }
}
