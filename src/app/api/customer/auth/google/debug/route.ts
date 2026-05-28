import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const host = req.headers.get('host')
  const xForwardedHost = req.headers.get('x-forwarded-host')
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const effectiveHost = xForwardedHost ?? host
  return NextResponse.json({
    host,
    xForwardedHost,
    effectiveHost,
    proto,
    redirectUri: `${proto}://${effectiveHost}/api/customer/auth/google/callback`,
    nextUrlOrigin: req.nextUrl.origin,
  })
}
