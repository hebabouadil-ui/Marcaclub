import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Customer from '@/lib/models/Customer'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

  await connectDB()
  const customer = await Customer.findOne({
    emailVerificationToken: token,
    emailVerificationExpiry: { $gt: new Date() },
  })

  if (!customer) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 })

  customer.emailVerified = true
  customer.emailVerificationToken = undefined
  customer.emailVerificationExpiry = undefined
  await customer.save()

  return NextResponse.json({ ok: true })
}
