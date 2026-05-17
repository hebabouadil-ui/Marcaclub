import mongoose, { Schema, Document } from 'mongoose'

export interface ISettings extends Document {
  liveStatus: boolean
  liveUrl?: string
  heroTitle: string
  heroSubtitle: string
  announcementBar: string
  announcementActive: boolean
  instagramUrl: string
  tiktokUrl: string
  whatsappNumber: string
}

const SettingsSchema = new Schema<ISettings>({
  liveStatus: { type: Boolean, default: false },
  liveUrl: { type: String, default: '' },
  heroTitle: { type: String, default: 'La Mode Exclusive' },
  heroSubtitle: {
    type: String,
    default: 'Collections importées directement de Primark Espagne',
  },
  announcementBar: {
    type: String,
    default: 'Livraison 24-48h • Paiement à la livraison • Nouveautés chaque semaine',
  },
  announcementActive: { type: Boolean, default: true },
  instagramUrl: { type: String, default: 'https://instagram.com/marcaclub' },
  tiktokUrl: { type: String, default: 'https://tiktok.com/@marcaclub' },
  whatsappNumber: { type: String, default: '+213000000000' },
})

export default mongoose.models.Settings ||
  mongoose.model<ISettings>('Settings', SettingsSchema)
