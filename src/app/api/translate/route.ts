import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

// Simple in-memory cache to avoid re-translating the same content
const cache = new Map<string, string>()

export async function POST(req: NextRequest) {
  try {
    const { text, targetLang } = await req.json()
    if (!text || !targetLang) return NextResponse.json({ error: 'Missing text or targetLang' }, { status: 400 })
    if (typeof text !== 'string' || text.length > 20000) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    if (targetLang !== 'en' && targetLang !== 'fr') return NextResponse.json({ error: 'Unsupported language' }, { status: 400 })

    const cacheKey = `${targetLang}:${text.slice(0, 120)}`
    if (cache.has(cacheKey)) return NextResponse.json({ translated: cache.get(cacheKey) })

    if (!process.env.ANTHROPIC_API_KEY) {
      // No API key — return original text so the page doesn't break
      return NextResponse.json({ translated: text })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const langName = targetLang === 'en' ? 'English' : 'French'

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Translate the following product description to ${langName}.
If it is HTML, keep all HTML tags intact and only translate the text content inside them.
If it is plain text, just translate it.
Return ONLY the translated content, nothing else.

${text}`,
      }],
    })

    const translated = (msg.content[0] as { type: string; text: string }).text?.trim() ?? text
    cache.set(cacheKey, translated)
    if (cache.size > 200) { const first = cache.keys().next().value; if (first) cache.delete(first) }

    return NextResponse.json({ translated })
  } catch (err) {
    console.error('Translate error:', err)
    // On failure, return original text so the product page doesn't break
    return NextResponse.json({ translated: null, error: 'Translation failed' })
  }
}
