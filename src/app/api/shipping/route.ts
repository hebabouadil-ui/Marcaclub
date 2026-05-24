import { NextRequest, NextResponse } from 'next/server'
import { getCJShippingInfo } from '@/lib/utils/cjApi'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const endCountryCode = searchParams.get('country') ?? 'US'
  const weight = Number(searchParams.get('weight') ?? 200)
  const vid = searchParams.get('vid') ?? undefined

  try {
    const data = await getCJShippingInfo({
      startCountryCode: 'CN',
      endCountryCode,
      productWeight: weight,
      quantity: 1,
      vid,
    })
    if (data.result && Array.isArray(data.data)) {
      return NextResponse.json({ options: data.data })
    }
    return NextResponse.json({ options: [] })
  } catch {
    return NextResponse.json({ options: [] })
  }
}
