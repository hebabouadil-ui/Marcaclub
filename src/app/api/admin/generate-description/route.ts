import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productName } = await req.json()
  if (!productName) return NextResponse.json({ error: 'productName required' }, { status: 400 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configurée' }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `Tu es un expert en rédaction de fiches produits pour un site e-commerce beauté & skincare premium (Marcaclub).

Rédige une description produit professionnelle en français pour ce produit : "${productName}"

Format OBLIGATOIRE (respecter exactement) :

[ACCROCHE] — Une seule phrase courte sur le bénéfice principal du produit.

✨ [Bénéfice 1 court et percutant]
🌿 [Bénéfice 2 court et percutant]
💆 [Bénéfice 3 court et percutant]
✅ [Bénéfice 4 court et percutant]

---
Contenance : [à deviner selon le nom produit]
Pour qui : Femme, Homme, Mixte
Type de peau : [adapter selon le produit]
Contenu : [produit principal]

RÈGLES STRICTES :
- Jamais mentionner CJ Dropshipping, la Chine, l'origine de fabrication
- Jamais écrire "Packing list" (écrire "Contenu")
- Jamais écrire "Applicable people" (écrire "Pour qui")
- Ton : luxueux, professionnel, élégant
- Maximum 120 mots au total
- En français uniquement`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    if (!text) return NextResponse.json({ error: 'Réponse vide du modèle' }, { status: 500 })
    return NextResponse.json({ description: text.trim() })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Generate description error:', msg)
    return NextResponse.json({ error: `Erreur API: ${msg}` }, { status: 500 })
  }
}
