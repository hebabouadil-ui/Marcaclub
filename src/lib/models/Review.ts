import mongoose, { Schema, Document } from 'mongoose'

export interface IReview extends Document {
  productId: string
  customerId?: string
  author: string
  location?: string
  rating: number
  title?: string
  body: string
  photo?: string
  productPhoto?: string
  verified: boolean
  date: Date
  createdAt: Date
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: { type: String, required: true, index: true },
    customerId: { type: String },
    author: { type: String, required: true },
    location: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String },
    body: { type: String, required: true },
    photo: { type: String },
    productPhoto: { type: String },
    verified: { type: Boolean, default: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

export default mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema)
