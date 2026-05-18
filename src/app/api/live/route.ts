import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Settings from '@/lib/models/Settings'

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
  try {
    await connectDB()
    const { liveStatus, liveUrl } = await req.json()
    const settings = await Settings.findOneAndUpdate(
      {},
      { liveStatus, liveUrl },
      { upsert: true, new: true }
    ).lean()
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
