import mongoose, { Schema, Document } from 'mongoose'

export interface IOrderItem {
  productId: string
  name: string
  price: number
  quantity: number
  size: string
  image: string
}

export interface IOrder extends Document {
  orderNumber: string
  customer: {
    name: string
    phone: string
    address: string
    city: string
    state?: string
    country: string
    postalCode?: string
    email?: string
  }
  items: IOrderItem[]
  total: number
  currency: string
  stripePaymentIntentId?: string
  stripePaymentStatus?: string
  cjOrderId?: string
  cjTrackingNumber?: string
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  flagged: boolean
  trusted?: boolean
  flagSeverity?: 'low' | 'medium' | 'high'
  flagReason?: string
  flaggedOrderNumbers?: string[]
  notes?: string
  ip?: string
  aiVerdict?: 'SAFE' | 'SUSPICIOUS' | 'HIGH_RISK'
  aiConfidence?: number
  aiReasoning?: string
  aiAnalyzedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String },
      country: { type: String, required: true, default: 'US' },
      postalCode: { type: String },
      email: { type: String },
    },
    items: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        size: { type: String, required: true },
        image: { type: String },
      },
    ],
    total: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    stripePaymentIntentId: { type: String },
    stripePaymentStatus: { type: String },
    cjOrderId: { type: String },
    cjTrackingNumber: { type: String },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    flagged: { type: Boolean, default: false },
    trusted: { type: Boolean, default: false },
    flagSeverity: { type: String, enum: ['low', 'medium', 'high'] },
    flagReason: { type: String },
    flaggedOrderNumbers: [{ type: String }],
    notes: { type: String },
    ip: { type: String },
    aiVerdict: { type: String, enum: ['SAFE', 'SUSPICIOUS', 'HIGH_RISK'] },
    aiConfidence: { type: Number },
    aiReasoning: { type: String },
    aiAnalyzedAt: { type: Date },
  },
  { timestamps: true }
)

// Indexes for hot-path queries (duplicate detection, risk analysis, list views)
OrderSchema.index({ 'customer.phone': 1 })
OrderSchema.index({ 'customer.name': 1, 'customer.city': 1 })
OrderSchema.index({ ip: 1 })
OrderSchema.index({ createdAt: -1, status: 1 })
OrderSchema.index({ flagged: 1, flagSeverity: 1 })
OrderSchema.index({ aiVerdict: 1 })

export default mongoose.models.Order ||
  mongoose.model<IOrder>('Order', OrderSchema)
