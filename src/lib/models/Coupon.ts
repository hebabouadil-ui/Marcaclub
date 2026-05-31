import mongoose, { Schema, Document } from 'mongoose'

export interface ICoupon extends Document {
  code: string
  type: 'percent' | 'fixed'
  value: number
  active: boolean
  expiresAt?: Date
  usageLimit?: number
  usageCount: number
  minOrderAmount?: number
  onePerCustomer: boolean
  usedByCustomers: string[]
  createdAt: Date
  updatedAt: Date
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date },
    usageLimit: { type: Number },
    usageCount: { type: Number, default: 0 },
    minOrderAmount: { type: Number },
    onePerCustomer: { type: Boolean, default: false },
    usedByCustomers: [{ type: String }],
  },
  { timestamps: true }
)

export default mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', CouponSchema)
