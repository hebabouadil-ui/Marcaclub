import mongoose, { Schema } from 'mongoose'

const BlockedIPSchema = new Schema(
  {
    ip: { type: String, required: true, unique: true },
    reason: { type: String, default: '' },
    orderNumbers: [{ type: String }],
  },
  { timestamps: true }
)

export default mongoose.models.BlockedIP ||
  mongoose.model('BlockedIP', BlockedIPSchema)
