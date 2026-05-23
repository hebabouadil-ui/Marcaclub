import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(new URL('/account/login?error=not_configured', req.url))
  }

  const returnTo = req.nextUrl.searchParams.get('returnTo') ?? '/'
  const state = encodeURIComponent(returnTo)
  const base = (process.env.SITE_URL ?? 'https://marca-club.com').replace(/\/$/, '')

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${base}/api/customer/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
