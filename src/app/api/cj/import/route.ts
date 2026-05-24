import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { getCJProductDetail } from '@/lib/utils/cjApi'
import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'

export const dynamic = 'force-dynamic'

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now()
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { pid, name, description, price, category, selectedVariants, cjLogisticName } = body

    if (!pid || !name || !price || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch full product detail from CJ
    const cjRes = await getCJProductDetail(pid)
    if (!cjRes.result || !cjRes.data) {
      return NextResponse.json({ error: 'CJ product not found' }, { status: 404 })
    }
    const cjProduct = cjRes.data

    await connectDB()

    // Build sizes from selected variants (or all variants if none selected)
    const variants = selectedVariants?.length
      ? cjProduct.variants?.filter((v: { vid: string }) => selectedVariants.includes(v.vid))
      : cjProduct.variants ?? []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sizes = variants.map((v: any) => ({
      size: v.variantNameEn || v.variantName || v.variantKey || v.variantProperty || 'One Size',
      stock: v.variantStock ?? v.variantInventory ?? v.stock ?? 100,
      cjVid: v.vid ?? v.variantId ?? '',
      variantPrice: v.variantSellPrice ?? v.variantPrice ?? v.sellPrice ?? undefined,
    }))

    const totalStock = sizes.reduce((sum: number, s: { stock: number }) => sum + s.stock, 0)

    // Use CJ images — handle both productImageSet (objects) and imageList (strings)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawProduct = cjProduct as any

    // productImage can be a JSON-encoded string array — parse it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parseImg = (val: any): string[] => {
      if (!val) return []
      if (typeof val === 'string' && val.startsWith('[')) {
        try { return JSON.parse(val).filter(Boolean) } catch { return [val] }
      }
      if (Array.isArray(val)) return val.map((v: unknown) => typeof v === 'string' ? v : (v as {imageUrl:string}).imageUrl).filter(Boolean)
      return typeof val === 'string' ? [val] : []
    }

    const mainImages = parseImg(rawProduct.productImage)
    const setImages = parseImg(rawProduct.productImageSet ?? rawProduct.imageList ?? rawProduct.productImages)
    const variantImages = variants
      .map((v: any) => v.variantImage ?? v.variantPicture ?? v.image)
      .filter(Boolean)
    const seen = new Set<string>()
    const images = [...mainImages, ...setImages, ...variantImages].filter((u: string) => {
      if (!u || !u.startsWith('http') || seen.has(u)) return false
      seen.add(u)
      return true
    })

    const product = await Product.create({
      name,
      slug: slugify(name),
      description: description || cjProduct.productNameEn,
      price: Number(price),
      originalPrice: undefined,
      images,
      originalImages: images,
      category,
      sizes,
      stock: totalStock,
      featured: false,
      active: true,
      cjPid: pid,
      cjLogisticName: cjLogisticName || undefined,
      cjData: {
        productName: cjProduct.productNameEn,
        variants: variants.map((v: { vid: string; variantNameEn: string; variantPrice: number; variantWeight: number }) => ({
          vid: v.vid,
          name: v.variantNameEn,
          price: v.variantPrice,
          weight: v.variantWeight,
        })),
      },
    })

    return NextResponse.json({ success: true, productId: String(product._id), slug: product.slug })
  } catch (err) {
    console.error('CJ import error:', err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
