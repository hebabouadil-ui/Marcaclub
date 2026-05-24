import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { getCJProductDetail, getCJShippingInfo } from '@/lib/utils/cjApi'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const pid = searchParams.get('pid')
  const shipping = searchParams.get('shipping')
  const vid = searchParams.get('vid') ?? undefined

  if (pid) {
    const data = await getCJProductDetail(pid)
    return NextResponse.json(data)
  }

  if (shipping) {
    const data = await getCJShippingInfo({
      startCountryCode: 'CN',
      endCountryCode: shipping,
      productWeight: 200,
      quantity: 1,
      vid,
    })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Pass ?pid=... or ?shipping=MA&vid=...' })
}
