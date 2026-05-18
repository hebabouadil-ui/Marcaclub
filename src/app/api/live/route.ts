import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Settings from '@/lib/models/Settings'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()
    const settings = await Settings.findOne().lean()
    return NextResponse.json({ liveStatus: (settings as { liveStatus?: boolean } | null)?.liveStatus ?? false })
  } catch {
    return NextResponse.json({ liveStatus: false })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const { liveStatus, liveUrl } = await req.json()
    const existing = await Settings.findOne()
    if (existing) {
      existing.liveStatus = liveStatus
      if (liveUrl !== undefined) existing.liveUrl = liveUrl
      await existing.save()
    } else {
      await Settings.create({ liveStatus, liveUrl })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
