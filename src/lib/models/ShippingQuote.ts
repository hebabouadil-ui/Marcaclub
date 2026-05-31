import mongoose, { Schema } from 'mongoose'

// Short-lived cache of CJ shipping results keyed by cart contents + destination country.
// Ensures product page, cart page, checkout display and payment intent always return the
// same shipping value for the same cart. Expires after 4 hours (CJ rates change infrequently).
const ShippingQuoteSchema = new Schema({
  cacheKey: { type: String, required: true, index: true },
  country: { type: String, required: true },
  shippingUSD: { type: Number, required: true },
  agingMin: { type: Number, default: 0 },
  agingMax: { type: Number, default: 0 },
  logisticName: { type: String, default: '' },
  source: { type: String, default: 'cj-sku' },
  createdAt: { type: Date, default: Date.now, expires: 14400 },  // TTL 4h
})

export default mongoose.models.ShippingQuote ||
  mongoose.model('ShippingQuote', ShippingQuoteSchema)
