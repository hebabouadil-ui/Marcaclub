import mongoose, { Schema, Document } from 'mongoose'

export interface ISettings extends Document {
  liveStatus: boolean
  liveUrl?: string
  heroTitle: string
  heroTitleEn?: string
  heroSubtitle: string
  heroSubtitleEn?: string
  announcementBar: string
  announcementActive: boolean
  instagramUrl: string
  tiktokUrl: string
  facebookUrl: string
  whatsappNumber: string
  emailNote: string
  contactEmail: string
  contactPhone: string
  shippingFeeCAD: number
}

const SettingsSchema = new Schema<ISettings>({
  liveStatus: { type: Boolean, default: false },
  liveUrl: { type: String, default: '' },
  heroTitle: { type: String, default: 'Votre Beauté, Notre Priorité' },
  heroTitleEn: { type: String, default: 'Your Beauty, Our Priority' },
  heroSubtitle: { type: String, default: 'Soins premium sélectionnés pour vous — livrés partout dans le monde' },
  heroSubtitleEn: { type: String, default: 'Premium skincare & beauty — curated and delivered worldwide' },
  announcementBar: {
    type: String,
    default: 'Livraison mondiale · Paiement sécurisé · Nouveaux produits chaque semaine',
  },
  announcementActive: { type: Boolean, default: true },
  instagramUrl: { type: String, default: 'https://instagram.com/marcaclub' },
  tiktokUrl: { type: String, default: 'https://tiktok.com/@marcaclub' },
  facebookUrl: { type: String, default: '' },
  whatsappNumber: { type: String, default: '+213000000000' },
  emailNote: { type: String, default: 'Notre équipe vous appellera pour confirmer votre commande. Pour toute question, contactez-nous sur WhatsApp au +212695504949.' },
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  shippingFeeCAD: { type: Number, default: 14.99 },
})

export default mongoose.models.Settings ||
  mongoose.model<ISettings>('Settings', SettingsSchema)
