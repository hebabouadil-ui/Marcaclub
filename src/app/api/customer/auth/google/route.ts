import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Canonical public origin — strip trailing slash, normalize to www if needed
function getSiteOrigin(): string {
  const url = (process.env.NEXTAUTH_URL ?? 'https://www.marca-club.com').replace(/\/$/, '')
  // If NEXTAUTH_URL is the non-www variant, canonicalize to www
  return url.replace('://marca-club.com', '://www.marca-club.com')
}

export async function GET(req: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(new URL('/account/login?error=not_configured', req.url))
  }

  const returnTo = req.nextUrl.searchParams.get('returnTo') ?? '/'
  const redirectUri = `${getSiteOrigin()}/api/customer/auth/google/callback`

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: returnTo,
    prompt: 'select_account',
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
