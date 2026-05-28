import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

// Simple in-memory cache to avoid re-translating the same content
const cache = new Map<string, string>()

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  // Allow logged-in customers (storefront users viewing product pages)
  const customerToken = req.cookies.get('mc-customer')?.value
  if (customerToken) {
    try { await jwtVerify(customerToken, SECRET); return true } catch { /* fall through */ }
  }
  // Also allow requests from the same origin (Next.js server-side, SSR)
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  if (origin && host && (origin.includes(host) || origin.includes('marca-club.com'))) {
    return true
  }
  return false
}

export async function POST(req: NextRequest) {
  try {
    const { text, targetLang } = await req.json()
    if (!text || !targetLang) return NextResponse.json({ error: 'Missing text or targetLang' }, { status: 400 })
    if (typeof text !== 'string' || text.length > 20000) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    if (targetLang !== 'en' && targetLang !== 'fr') return NextResponse.json({ error: 'Unsupported language' }, { status: 400 })

    // Rate-limit: require storefront session or same-origin
    if (!(await isAuthenticated(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cacheKey = `${targetLang}:${text.slice(0, 120)}`
    if (cache.has(cacheKey)) return NextResponse.json({ translated: cache.get(cacheKey) })

    const langName = targetLang === 'en' ? 'English' : 'French'

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
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
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
