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
  const base = (process.env.SITE_URL ?? 'https://marca-club.com').replace(/\/$/, '')

  if (!code) {
    return NextResponse.redirect(new URL('/account/login?error=oauth_denied', req.url))
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        redirect_uri: `${base}/api/customer/auth/facebook/callback`,
        code,
      })
    )
    const tokens = await tokenRes.json()
    if (!tokens.access_token) throw new Error('No access token from Facebook')

    // Get user profile
    const userRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${tokens.access_token}`
    )
    const fbUser = await userRes.json()
    if (!fbUser.email) throw new Error('No email from Facebook — user may not have granted email permission')

    // Find or create customer
    await connectDB()
    let customer = await Customer.findOne({ email: fbUser.email.toLowerCase() })
    if (!customer) {
      const passwordHash = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10)
      customer = await Customer.create({
        name: fbUser.name ?? fbUser.email.split('@')[0],
        email: fbUser.email.toLowerCase(),
        passwordHash,
        facebookId: fbUser.id,
      })
    } else if (!customer.facebookId) {
      customer.facebookId = fbUser.id
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
    console.error('Facebook OAuth error:', err)
    return NextResponse.redirect(new URL('/account/login?error=oauth_failed', req.url))
  }
}
