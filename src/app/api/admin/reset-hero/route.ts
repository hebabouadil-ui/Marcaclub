import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { connectDB } from '@/lib/db'
import Settings from '@/lib/models/Settings'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const existing = await Settings.findOne()
  if (existing) {
    existing.heroTitle = 'Upgrade Your Ride'
    existing.heroSubtitle = 'Accessoires auto premium sélectionnés — livrés partout dans le monde'
    existing.announcementBar = 'Livraison mondiale · Paiement sécurisé · Nouveaux produits chaque semaine'
    await existing.save()
  }
  return NextResponse.json({ ok: true })
}
