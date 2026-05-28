import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const host = req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  return NextResponse.json({
    host,
    proto,
    redirectUri: `${proto}://${host}/api/customer/auth/google/callback`,
    nextUrlOrigin: req.nextUrl.origin,
  })
}
