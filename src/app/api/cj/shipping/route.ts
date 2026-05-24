import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { getCJShippingInfo } from '@/lib/utils/cjApi'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const endCountryCode = searchParams.get('endCountryCode') ?? 'US'
  const productWeight = Number(searchParams.get('weight') ?? 200)
  const quantity = Number(searchParams.get('quantity') ?? 1)
  const vid = searchParams.get('vid') ?? undefined
  const variantSku = searchParams.get('variantSku') ?? undefined

  try {
    const data = await getCJShippingInfo({
      startCountryCode: 'CN',
      endCountryCode,
      productWeight,
      quantity,
      vid,
      variantSku,
    })
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
