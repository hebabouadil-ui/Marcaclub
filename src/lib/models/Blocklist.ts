import mongoose, { Schema, Document } from 'mongoose'

export interface IBlocklistEntry extends Document {
  phone?: string
  name?: string
  address?: string
  city?: string
  reason?: string
  createdAt: Date
  updatedAt: Date
}

const BlocklistSchema = new Schema<IBlocklistEntry>(
  {
    phone: { type: String, index: true },
    name: { type: String, index: true },
    address: { type: String },
    city: { type: String },
    reason: { type: String },
  },
  { timestamps: true }
)

export default mongoose.models.Blocklist ||
  mongoose.model<IBlocklistEntry>('Blocklist', BlocklistSchema)
