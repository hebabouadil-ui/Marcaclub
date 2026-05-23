import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Vercel injects these headers on every request automatically — no external API needed
export async function GET(req: NextRequest) {
  const countryCode = req.headers.get('x-vercel-ip-country') ?? ''
  const region = req.headers.get('x-vercel-ip-country-region') ?? ''
  const city = req.headers.get('x-vercel-ip-city') ?? ''

  return NextResponse.json({ countryCode, region, city })
}
