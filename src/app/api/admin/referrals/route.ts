import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { connectDB } from '@/lib/db'
import Referral from '@/lib/models/Referral'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const referrals = await Referral.find({})
    .populate('referrerId', 'name email')
    .populate('referredId', 'name email')
    .sort({ createdAt: -1 })
    .lean()
  return NextResponse.json(referrals)
}
