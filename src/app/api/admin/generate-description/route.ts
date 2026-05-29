import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productName } = await req.json()
  if (!productName) return NextResponse.json({ error: 'productName required' }, { status: 400 })

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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ description: text.trim() })
  } catch (err) {
    console.error('Generate description error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
