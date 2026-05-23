import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { searchCJProducts, getCJProductDetail } from '@/lib/utils/cjApi'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const pid = searchParams.get('pid')

  try {
    if (pid) {
      const data = await getCJProductDetail(pid)
      return NextResponse.json(data)
    }

    const data = await searchCJProducts({
      productName: searchParams.get('q') ?? undefined,
      categoryId: searchParams.get('categoryId') ?? undefined,
      pageNum: Number(searchParams.get('page') ?? 1),
      pageSize: 20,
    })
    return NextResponse.json(data)
  } catch (err) {
    console.error('CJ products error:', err)
    return NextResponse.json({ error: 'CJ API error' }, { status: 500 })
  }
}
