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

    const sizes = variants.map((v: { variantNameEn: string; variantStock: number; vid: string }) => ({
      size: v.variantNameEn || 'One Size',
      stock: v.variantStock ?? 100,
      cjVid: v.vid,
    }))

    const totalStock = sizes.reduce((sum: number, s: { stock: number }) => sum + s.stock, 0)

    // Use CJ images — first image as main, rest as gallery
    const images = [
      cjProduct.productImage,
      ...(cjProduct.productImageSet?.map((img: { imageUrl: string }) => img.imageUrl) ?? []),
    ].filter(Boolean).slice(0, 8)

    const product = await Product.create({
      name,
      slug: slugify(name),
      description: description || cjProduct.productNameEn,
      price: Number(price),
      originalPrice: cjProduct.sellingPrice ? Number(cjProduct.sellingPrice) : undefined,
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
