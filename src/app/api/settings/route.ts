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
    const settings = await Settings.findOneAndUpdate({}, body, { upsert: true, new: true }).lean()
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
