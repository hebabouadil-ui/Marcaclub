import mongoose, { Schema } from 'mongoose'

const VisitorSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  lastSeen: { type: Date, default: Date.now, index: { expires: 300 } }, // auto-delete after 5min
  page: { type: String },
  ip: { type: String },
})

export default mongoose.models.Visitor ||
  mongoose.model('Visitor', VisitorSchema)
