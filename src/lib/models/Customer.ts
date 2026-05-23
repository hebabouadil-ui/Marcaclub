import mongoose, { Schema, Document } from 'mongoose'

export interface ICustomer extends Document {
  name: string
  email: string
  passwordHash: string
  phone?: string
  country?: string
  googleId?: string
  facebookId?: string
  createdAt: Date
  updatedAt: Date
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String },
    country: { type: String },
    googleId: { type: String, sparse: true },
    facebookId: { type: String, sparse: true },
  },
  { timestamps: true }
)

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema)
