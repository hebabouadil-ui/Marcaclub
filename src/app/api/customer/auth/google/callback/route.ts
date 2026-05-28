import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { connectDB } from '@/lib/db'
import Customer from '@/lib/models/Customer'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

export const dynamic = 'force-dynamic'

function getSiteOrigin(): string {
  const url = (process.env.NEXTAUTH_URL ?? 'https://www.marca-club.com').replace(/\/$/, '')
  return url.replace('://marca-club.com', '://www.marca-club.com')
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const googleError = searchParams.get('error')

  if (googleError) {
    console.error('Google OAuth denied:', googleError)
    return NextResponse.redirect(new URL('/account/login?error=oauth_denied', req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/account/login?error=oauth_denied', req.url))
  }

  const siteOrigin = getSiteOrigin()
  const redirectUri = `${siteOrigin}/api/customer/auth/google/callback`
  console.log('[google-callback] redirect_uri:', redirectUri)

  try {
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

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const gUser = await userRes.json()
    if (!gUser.email) throw new Error('No email from Google')

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

    const customerId = String(customer._id)
    const token = await new SignJWT({ sub: customerId, email: customer.email, name: customer.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(SECRET)
    // Only allow same-origin redirects to prevent open-redirect attacks via the state param
    const returnTo = (state && state.startsWith('/') && !state.startsWith('//')) ? state : '/'
    const redirectUrl = `${siteOrigin}${returnTo}`
    const res = NextResponse.redirect(redirectUrl)
    res.cookies.set('mc-customer', token, {
      httpOnly: true,
      secure: true,
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
