import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const nextauthUrl = process.env.NEXTAUTH_URL ?? ''
  const base = nextauthUrl.replace(/\/$/, '')
  const redirectUri = `${base}/api/customer/auth/google/callback`
  const clientId = process.env.GOOGLE_CLIENT_ID ?? ''
  return NextResponse.json({
    nextauthUrl,
    redirectUri,
    clientIdPrefix: clientId.slice(0, 20) + '…',
    clientIdConfigured: !!clientId,
    clientSecretConfigured: !!process.env.GOOGLE_CLIENT_SECRET,
  })
}
