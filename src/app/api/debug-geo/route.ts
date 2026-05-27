import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return NextResponse.json({
    'x-vercel-ip-country': req.headers.get('x-vercel-ip-country'),
    'x-country': req.headers.get('x-country'),
    'mc-country-code-cookie': req.cookies.get('mc-country-code')?.value,
    'all-headers': Object.fromEntries(req.headers.entries()),
  })
}
