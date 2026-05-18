import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Settings from '@/lib/models/Settings'

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

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()
    const existing = await Settings.findOne()
    if (existing) {
      Object.assign(existing, body)
      await existing.save()
    } else {
      await Settings.create(body)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PUT /api/settings error:', err)
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}
