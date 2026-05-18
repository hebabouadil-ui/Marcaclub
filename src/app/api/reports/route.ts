import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/lib/models/Order'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  await connectDB()
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  const orders = await Order.find({ createdAt: { $gte: start, $lt: end } }).lean()

  const rows = orders.map((o) => ({
    'N° Commande': o.orderNumber,
    'Date': new Date(o.createdAt).toLocaleDateString('fr-FR'),
    'Client': o.customer.name,
    'Téléphone': o.customer.phone,
    'Ville': o.customer.city,
    'Statut': o.status,
    'Articles': o.items.map((i: { name: string; size: string; quantity: number }) => `${i.name} (${i.size}) x${i.quantity}`).join(', '),
    'Total (MAD)': o.total,
    'Comptabilisé': ['confirmed', 'shipped', 'delivered'].includes(o.status) ? 'Oui' : 'Non',
  }))

  const revenue = orders
    .filter((o) => ['confirmed', 'shipped', 'delivered'].includes(o.status))
    .reduce((s, o) => s + o.total, 0)

  const summaryRows = [
    {},
    { 'N° Commande': 'RÉSUMÉ', 'Client': '' },
    { 'N° Commande': 'Total commandes', 'Date': orders.length },
    { 'N° Commande': 'Commandes confirmées/livrées', 'Date': orders.filter((o) => ['confirmed', 'shipped', 'delivered'].includes(o.status)).length },
    { 'N° Commande': 'Commandes annulées', 'Date': orders.filter((o) => o.status === 'cancelled').length },
    { 'N° Commande': 'Chiffre d\'affaires (MAD)', 'Date': revenue.toFixed(2) },
  ]

  const ws = XLSX.utils.json_to_sheet([...rows, ...summaryRows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Commandes')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const monthName = start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="marcaclub-${monthName}.xlsx"`,
    },
  })
}
