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
    return NextResponse.json(settings || {})
  } catch (err) {
    console.error('GET /api/settings error:', err)
    return NextResponse.json({})
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    const body = await req.json()
    const ALLOWED = ['heroTitle','heroSubtitle','announcementBar','announcementActive',
      'instagramUrl','tiktokUrl','facebookUrl','whatsappNumber','emailNote','contactEmail','contactPhone',
      'liveStatus','liveUrl']
    const sanitized = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))
    const existing = await Settings.findOne()
    if (existing) {
      Object.assign(existing, sanitized)
      await existing.save()
    } else {
      await Settings.create(body)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PUT /api/settings error:', err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
