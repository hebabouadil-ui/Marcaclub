import mongoose, { Schema, Document } from 'mongoose'

export interface IReferral extends Document {
  referrerId: mongoose.Types.ObjectId
  referrerCode: string
  referredEmail: string
  referredId?: mongoose.Types.ObjectId
  referredOrderId?: mongoose.Types.ObjectId
  status: 'pending' | 'registered' | 'completed'
  referrerRewarded: boolean
  referredRewarded: boolean
  createdAt: Date
  updatedAt: Date
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    referrerCode: { type: String, required: true },
    referredEmail: { type: String, required: true, lowercase: true },
    referredId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    referredOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    status: { type: String, enum: ['pending', 'registered', 'completed'], default: 'pending' },
    referrerRewarded: { type: Boolean, default: false },
    referredRewarded: { type: Boolean, default: false },
  },
  { timestamps: true }
)

ReferralSchema.index({ referrerId: 1 })
ReferralSchema.index({ referredEmail: 1 })

export default mongoose.models.Referral || mongoose.model<IReferral>('Referral', ReferralSchema)
