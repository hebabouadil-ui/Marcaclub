import mongoose, { Schema, Document } from 'mongoose'

export interface IProduct extends Document {
  name: string
  slug: string
  description: string
  descriptionEn?: string
  price: number
  originalPrice?: number
  images: string[]
  originalImages: string[]
  category: string
  sizes: Array<{ size: string; stock: number; cjVid?: string; cjSku?: string; variantPrice?: number; baseVariantPrice?: number }>
  stock: number
  featured: boolean
  active: boolean
  cjPid?: string
  cjLogisticName?: string
  productWeight?: number
  shippingBakedMad?: number
  shippingBakedUSD?: number
  shippingRefCountry?: string
  cjData?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '' },
    descriptionEn: { type: String, default: '' },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    images: [{ type: String }],
    originalImages: [{ type: String }],
    category: { type: String, required: true },
    sizes: [{ size: { type: String }, stock: { type: Number, default: 0 }, cjVid: { type: String }, cjSku: { type: String }, variantPrice: { type: Number }, baseVariantPrice: { type: Number } }],
    stock: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    cjPid: { type: String },
    cjLogisticName: { type: String },
    productWeight: { type: Number },
    shippingBakedMad: { type: Number },
    shippingBakedUSD: { type: Number },
    shippingRefCountry: { type: String },
    cjData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

export default mongoose.models.Product ||
  mongoose.model<IProduct>('Product', ProductSchema)
