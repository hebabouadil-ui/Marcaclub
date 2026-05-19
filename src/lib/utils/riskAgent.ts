import Anthropic from '@anthropic-ai/sdk'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import Blocklist from '@/lib/models/Blocklist'
import BlockedIP from '@/lib/models/BlockedIP'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface RiskVerdict {
  verdict: 'SAFE' | 'SUSPICIOUS' | 'HIGH_RISK'
  confidence: number
  reasoning: string
  signals: string[]
  recommendation: string
}

interface OrderContext {
  orderId: string
  orderNumber: string
  customer: { name: string; phone: string; city: string; address: string; email?: string }
  items: Array<{ name: string; quantity: number; size: string; price: number }>
  total: number
  ip?: string
  createdAt: string
}

// Tools the agent can call to gather intelligence
const tools: Anthropic.Tool[] = [
  {
    name: 'get_customer_order_history',
    description: 'Retrieve all past orders from the same phone number or customer name to detect patterns',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'Customer phone number (digits only)' },
        name: { type: 'string', description: 'Customer full name' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'check_customer_blocklist',
    description: 'Check if the customer phone, name, or address matches any entry in the blocklist',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string' },
        name: { type: 'string' },
        address: { type: 'string' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'get_ip_order_history',
    description: 'Get all orders placed from the same IP address to detect multi-account fraud',
    input_schema: {
      type: 'object' as const,
      properties: {
        ip: { type: 'string', description: 'IP address to look up' },
      },
      required: ['ip'],
    },
  },
  {
    name: 'check_ip_blocklist',
    description: 'Check if this IP address is in the blocked IPs list',
    input_schema: {
      type: 'object' as const,
      properties: {
        ip: { type: 'string' },
      },
      required: ['ip'],
    },
  },
  {
    name: 'get_city_order_stats',
    description: 'Get recent order statistics for a city to detect unusual activity spikes',
    input_schema: {
      type: 'object' as const,
      properties: {
        city: { type: 'string' },
        days: { type: 'number', description: 'Number of days to look back (default 7)' },
      },
      required: ['city'],
    },
  },
  {
    name: 'get_delivery_success_rate',
    description: 'Get the historical delivery success rate for a phone number or city',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string' },
        city: { type: 'string' },
      },
      required: [],
    },
  },
]

// Tool execution — each tool hits MongoDB directly
async function executeTool(name: string, input: Record<string, string | number>): Promise<string> {
  await connectDB()

  if (name === 'get_customer_order_history') {
    const phone = String(input.phone || '').replace(/\D/g, '').slice(-9)
    const nameVal = input.name ? String(input.name) : ''
    const query = nameVal
      ? { $or: [{ 'customer.phone': { $regex: phone } }, { 'customer.name': { $regex: new RegExp(nameVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } }] }
      : { 'customer.phone': { $regex: phone } }

    const orders = await Order.find(query)
      .select('orderNumber status total createdAt customer.city ip')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    if (orders.length === 0) return JSON.stringify({ found: 0, message: 'No previous orders found for this customer' })

    const delivered = orders.filter((o) => o.status === 'delivered').length
    const cancelled = orders.filter((o) => o.status === 'cancelled').length
    return JSON.stringify({
      found: orders.length,
      delivered,
      cancelled,
      deliveryRate: orders.length > 0 ? Math.round((delivered / orders.length) * 100) : 0,
      cancellationRate: orders.length > 0 ? Math.round((cancelled / orders.length) * 100) : 0,
      orders: orders.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
        city: (o.customer as { city: string }).city,
        date: o.createdAt,
      })),
    })
  }

  if (name === 'check_customer_blocklist') {
    const phone = String(input.phone || '').replace(/\D/g, '').slice(-9)
    const nameVal = input.name ? String(input.name).toLowerCase() : ''
    const addressVal = input.address ? String(input.address).toLowerCase() : ''

    type Entry = { phone?: string; name?: string; address?: string; reason?: string }
    const entries = await Blocklist.find({}).lean() as Entry[]
    const matches: string[] = []

    for (const e of entries) {
      if (e.phone && e.phone.replace(/\D/g, '').slice(-9) === phone) matches.push(`phone matches blocklist entry${e.reason ? ` (${e.reason})` : ''}`)
      else if (nameVal && e.name && e.name.toLowerCase() === nameVal) matches.push(`name matches blocklist entry${e.reason ? ` (${e.reason})` : ''}`)
      else if (addressVal && e.address && addressVal.includes(e.address.toLowerCase())) matches.push(`address matches blocklist entry${e.reason ? ` (${e.reason})` : ''}`)
    }

    return JSON.stringify({ blocked: matches.length > 0, matches })
  }

  if (name === 'get_ip_order_history') {
    const ip = String(input.ip || '')
    if (!ip || ip === 'unknown') return JSON.stringify({ message: 'No IP available' })

    const orders = await Order.find({ ip })
      .select('orderNumber status total createdAt customer.name customer.phone customer.city')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    if (orders.length === 0) return JSON.stringify({ found: 0, message: 'No previous orders from this IP' })

    type Cust = { name: string; phone: string; city: string }
    const uniquePhones = new Set(orders.map((o) => (o.customer as Cust).phone.replace(/\D/g, '').slice(-9)))
    const uniqueNames = new Set(orders.map((o) => (o.customer as Cust).name.toLowerCase()))
    const delivered = orders.filter((o) => o.status === 'delivered').length
    const cancelled = orders.filter((o) => o.status === 'cancelled').length

    return JSON.stringify({
      found: orders.length,
      uniqueCustomers: uniquePhones.size,
      multipleIdentities: uniquePhones.size > 1 || uniqueNames.size > 1,
      delivered,
      cancelled,
      orders: orders.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        name: (o.customer as Cust).name,
        phone: (o.customer as Cust).phone,
        city: (o.customer as Cust).city,
        date: o.createdAt,
      })),
    })
  }

  if (name === 'check_ip_blocklist') {
    const ip = String(input.ip || '')
    if (!ip || ip === 'unknown') return JSON.stringify({ blocked: false })
    type BEntry = { ip: string; reason?: string }
    const entry = await BlockedIP.findOne({ ip }).lean() as BEntry | null
    return JSON.stringify({ blocked: !!entry, reason: entry?.reason || null })
  }

  if (name === 'get_city_order_stats') {
    const city = String(input.city || '')
    const days = Number(input.days) || 7
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const orders = await Order.find({
      'customer.city': { $regex: new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      createdAt: { $gte: since },
    }).select('status total').lean()

    const cancelled = orders.filter((o) => o.status === 'cancelled').length
    return JSON.stringify({
      totalOrders: orders.length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      cancelled,
      cancellationRate: orders.length > 0 ? Math.round((cancelled / orders.length) * 100) : 0,
      totalRevenue: orders.filter((o) => ['confirmed', 'shipped', 'delivered'].includes(o.status)).reduce((s, o) => s + o.total, 0),
    })
  }

  if (name === 'get_delivery_success_rate') {
    const phone = input.phone ? String(input.phone).replace(/\D/g, '').slice(-9) : ''
    const city = input.city ? String(input.city) : ''

    const query: Record<string, unknown> = {}
    if (phone) query['customer.phone'] = { $regex: phone }
    else if (city) query['customer.city'] = { $regex: new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }

    const orders = await Order.find(query).select('status').lean()
    const delivered = orders.filter((o) => o.status === 'delivered').length
    const cancelled = orders.filter((o) => o.status === 'cancelled').length

    return JSON.stringify({
      totalOrders: orders.length,
      delivered,
      cancelled,
      successRate: orders.length > 0 ? Math.round((delivered / orders.length) * 100) : null,
      cancellationRate: orders.length > 0 ? Math.round((cancelled / orders.length) * 100) : null,
    })
  }

  return JSON.stringify({ error: 'Unknown tool' })
}

export async function analyzeOrderRisk(order: OrderContext): Promise<RiskVerdict> {
  const systemPrompt = `You are an advanced fraud detection agent for Marcaclub, a Moroccan e-commerce store selling clothing. Your job is to analyze orders and determine if they are safe to deliver or pose a fraud/non-delivery risk.

Context about the business:
- Orders are paid on delivery (cash on delivery), so failed deliveries = lost shipping costs
- Main risks: fake orders, serial non-delivery customers, identity fraud, coordinated fraud rings
- Morocco-specific: some customers place multiple orders from different numbers/names but same address/IP
- Typical order values: 200–1500 MAD

Use the available tools to gather intelligence, then produce a final verdict.

Your verdict must be one of:
- SAFE: Low risk, proceed with delivery
- SUSPICIOUS: Medium risk, call customer to verify before shipping
- HIGH_RISK: Do not deliver without strong verification, likely fraudulent

Always explain your reasoning in French (the business language). Be precise and data-driven.`

  const userMessage = `Analyze this new order for delivery risk:

Order #${order.orderNumber}
Customer: ${order.customer.name}
Phone: ${order.customer.phone}
City: ${order.customer.city}
Address: ${order.customer.address}
${order.customer.email ? `Email: ${order.customer.email}` : ''}
IP: ${order.ip || 'unknown'}
Total: ${order.total} MAD
Items: ${order.items.map((i) => `${i.name} (${i.size} ×${i.quantity})`).join(', ')}
Placed at: ${new Date(order.createdAt).toLocaleString('fr-MA')}

Use all available tools to investigate this customer thoroughly, then give your final verdict.`

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }]

  // Agentic loop — keep calling tools until the agent decides to stop
  for (let round = 0; round < 10; round++) {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      tools,
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      // Extract the final text response
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')

      return parseVerdict(text)
    }

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUses) {
        const result = await executeTool(toolUse.name, toolUse.input as Record<string, string | number>)
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: result })
      }

      messages.push({ role: 'user', content: toolResults })
    }
  }

  return { verdict: 'SUSPICIOUS', confidence: 50, reasoning: 'Analyse incomplète — vérification manuelle requise.', signals: [], recommendation: 'Appeler le client avant livraison' }
}

function parseVerdict(text: string): RiskVerdict {
  // Try to extract structured verdict from the agent's response
  const verdictMatch = text.match(/\b(SAFE|SUSPICIOUS|HIGH_RISK)\b/)
  const confidenceMatch = text.match(/confidence[:\s]+(\d+)/i) || text.match(/(\d+)%\s*(?:de confiance|confidence)/i)
  const verdict = (verdictMatch?.[1] as RiskVerdict['verdict']) || 'SUSPICIOUS'
  const confidence = confidenceMatch ? Math.min(100, Math.max(0, parseInt(confidenceMatch[1]))) : 60

  // Extract signals (lines starting with - or •)
  const signalLines = text.match(/^[-•*]\s+(.+)$/gm) || []
  const signals = signalLines.map((l) => l.replace(/^[-•*]\s+/, '').trim()).filter(Boolean).slice(0, 8)

  // Extract recommendation
  const recMatch = text.match(/recommandation[:\s]+([^\n.]+)/i) ||
                   text.match(/(?:livrer|ne pas livrer|appeler|vérifier)[^\n.]+/i)
  const recommendation = recMatch
    ? recMatch[0].replace(/^recommandation[:\s]+/i, '').trim()
    : verdict === 'SAFE' ? 'Procéder à la livraison' : verdict === 'HIGH_RISK' ? 'Ne pas livrer sans vérification' : 'Appeler le client avant livraison'

  return { verdict, confidence, reasoning: text.slice(0, 1500), signals, recommendation }
}
