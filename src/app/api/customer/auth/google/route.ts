import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Derive the redirect URI from NEXTAUTH_URL (already set in Vercel) so it's
// always deterministic and never affected by proxy headers.
function getRedirectUri() {
  const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
  return `${base}/api/customer/auth/google/callback`
}

export async function GET(req: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(new URL('/account/login?error=not_configured', req.url))
  }

  const returnTo = req.nextUrl.searchParams.get('returnTo') ?? '/'
  const redirectUri = getRedirectUri()

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
