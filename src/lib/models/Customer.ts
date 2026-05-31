import mongoose, { Schema, Document } from 'mongoose'

export interface ICreditHistoryEntry {
  amount: number
  reason: string
  orderId?: string
  createdAt: Date
}

export interface ICustomer extends Document {
  name: string
  email: string
  passwordHash?: string
  phone?: string
  country?: string
  googleId?: string
  facebookId?: string
  resetToken?: string
  resetTokenExpiry?: Date
  emailVerified: boolean
  emailVerificationToken?: string
  emailVerificationExpiry?: Date
  referralCode: string
  referredBy?: string
  storeCredit: number
  creditHistory: ICreditHistoryEntry[]
  createdAt: Date
  updatedAt: Date
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    phone: { type: String },
    country: { type: String },
    googleId: { type: String, sparse: true },
    facebookId: { type: String, sparse: true },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpiry: { type: Date },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: String },
    storeCredit: { type: Number, default: 0 },
    creditHistory: [
      {
        amount: { type: Number, required: true },
        reason: { type: String, required: true },
        orderId: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
)

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema)
