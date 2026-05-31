import { connectDB } from '@/lib/db'
import Product from '@/lib/models/Product'

export const CART_WEIGHT_LIMIT_KG = 1.9

interface WeightItem {
  productId: string
  size: string
  quantity: number
}

interface ProductDoc {
  productWeight?: number
  sizes?: Array<{ size: string; variantWeight?: number }>
  cjData?: { variants?: Array<{ weight?: number; variantWeight?: number }> }
}

/**
 * Returns total cart weight in kg. Reads product weight fields from MongoDB.
 * Uses the same weight resolution order as computeShipping.ts.
 */
export async function getCartWeightKg(items: WeightItem[]): Promise<number> {
  await connectDB()
  let totalGrams = 0

  for (const item of items) {
    const product = await Product.findById(item.productId).lean() as ProductDoc | null
    if (!product) continue

    const matchedSize = product.sizes?.find(s => s.size === item.size)
    const anySize = product.sizes?.find(s => s.variantWeight)
    const cjVariantWeight =
      product.cjData?.variants?.[0]?.weight ??
      product.cjData?.variants?.[0]?.variantWeight ??
      0
    const itemWeightG =
      matchedSize?.variantWeight ??
      anySize?.variantWeight ??
      product.productWeight ??
      cjVariantWeight ??
      0

    totalGrams += itemWeightG * item.quantity
  }

  return totalGrams / 1000
}

/**
 * Returns { ok: true } if cart is within weight limit, or { ok: false, weightKg, limitKg } if over.
 */
export async function validateCartWeight(items: WeightItem[]): Promise<
  { ok: true; weightKg: number } | { ok: false; weightKg: number; limitKg: number }
> {
  const weightKg = await getCartWeightKg(items)
  if (weightKg >= CART_WEIGHT_LIMIT_KG) {
    return { ok: false, weightKg, limitKg: CART_WEIGHT_LIMIT_KG }
  }
  return { ok: true, weightKg }
}
