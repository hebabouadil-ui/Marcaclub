import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Customer from '@/lib/models/Customer'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    if (password.length < 8) return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 })

    await connectDB()
    const customer = await Customer.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    })

    if (!customer) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 })

    customer.passwordHash = await bcrypt.hash(password, 12)
    customer.resetToken = undefined
    customer.resetTokenExpiry = undefined
    await customer.save()

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('reset-password error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
