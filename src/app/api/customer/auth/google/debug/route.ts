import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const clientId = process.env.GOOGLE_CLIENT_ID ?? ''
  return NextResponse.json({
    redirectUri: `${proto}://${host}/api/customer/auth/google/callback`,
    clientIdPrefix: clientId.slice(0, 20) + '…',
    clientIdSuffix: '…' + clientId.slice(-15),
    clientIdConfigured: !!clientId,
  })
}
