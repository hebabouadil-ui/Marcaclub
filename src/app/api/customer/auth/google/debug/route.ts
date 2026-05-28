import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getSiteOrigin(): string {
  const url = (process.env.NEXTAUTH_URL ?? 'https://www.marca-club.com').replace(/\/$/, '')
  return url.replace('://marca-club.com', '://www.marca-club.com')
}

export async function GET(req: NextRequest) {
  const siteOrigin = getSiteOrigin()
  return NextResponse.json({
    nextauthUrl: process.env.NEXTAUTH_URL,
    siteOrigin,
    redirectUri: `${siteOrigin}/api/customer/auth/google/callback`,
    clientIdConfigured: !!process.env.GOOGLE_CLIENT_ID,
    clientSecretConfigured: !!process.env.GOOGLE_CLIENT_SECRET,
  })
}
