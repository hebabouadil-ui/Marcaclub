import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Settings from '@/lib/models/Settings'

export async function GET() {
  try {
    await connectDB()
    const settings = await Settings.findOne().lean()
    return NextResponse.json(settings || {})
  } catch {
    return NextResponse.json({})
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: body },
      { upsert: true, returnDocument: 'after', lean: true }
    )
    return NextResponse.json(settings)
  } catch (err) {
    console.error('PUT /api/settings error:', err)
    return NextResponse.json({ message: String(err) }, { status: 500 })
  }
}
