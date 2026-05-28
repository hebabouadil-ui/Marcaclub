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
  const googleError = searchParams.get('error')

  // Google rejected the auth (user cancelled, etc.)
  if (googleError) {
    console.error('Google OAuth denied:', googleError)
    return NextResponse.redirect(new URL('/account/login?error=oauth_denied', req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/account/login?error=oauth_denied', req.url))
  }

  // Derive the redirect_uri from the actual request URL so it always matches
  // what was sent in the initial auth request (both use req.url-based origin)
  const reqOrigin = new URL(req.url).origin
  const redirectUri = `${reqOrigin}/api/customer/auth/google/callback`

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokens.access_token) {
      console.error('Google token exchange failed:', JSON.stringify(tokens))
      const msg = tokens.error_description ?? tokens.error ?? 'token_failed'
      return NextResponse.redirect(new URL(`/account/login?error=${encodeURIComponent(msg)}`, req.url))
    }

    // Get user profile
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const gUser = await userRes.json()
    if (!gUser.email) throw new Error('No email from Google')

    // Find or create customer — Google-verified so emailVerified = true
    await connectDB()
    let customer = await Customer.findOne({ email: gUser.email.toLowerCase() })
    if (!customer) {
      const passwordHash = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10)
      customer = await Customer.create({
        name: gUser.name ?? gUser.email.split('@')[0],
        email: gUser.email.toLowerCase(),
        passwordHash,
        googleId: gUser.sub,
        emailVerified: true,
      })
    } else {
      let changed = false
      if (!customer.googleId) { customer.googleId = gUser.sub; changed = true }
      if (!customer.emailVerified) { customer.emailVerified = true; changed = true }
      if (changed) await customer.save()
    }

    const token = await signCustomerToken({ id: String(customer._id), email: customer.email, name: customer.name })
    const returnTo = state || '/'
    const redirectUrl = returnTo.startsWith('http') ? returnTo : new URL(returnTo, req.url).toString()
    const res = NextResponse.redirect(redirectUrl)
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
