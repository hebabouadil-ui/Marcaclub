import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!process.env.FACEBOOK_APP_ID) {
    return NextResponse.redirect(new URL('/account/login?error=not_configured', req.url))
  }

  const returnTo = req.nextUrl.searchParams.get('returnTo') ?? '/'
  const state = encodeURIComponent(returnTo)
  const base = (process.env.SITE_URL ?? 'https://marca-club.com').replace(/\/$/, '')

  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID,
    redirect_uri: `${base}/api/customer/auth/facebook/callback`,
    response_type: 'code',
    scope: 'email,public_profile',
    state,
  })

  return NextResponse.redirect(`https://www.facebook.com/v18.0/dialog/oauth?${params}`)
}
