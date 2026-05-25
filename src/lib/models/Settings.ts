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
  facebookUrl: string
  whatsappNumber: string
  emailNote: string
  contactEmail: string
  contactPhone: string
}

const SettingsSchema = new Schema<ISettings>({
  liveStatus: { type: Boolean, default: false },
  liveUrl: { type: String, default: '' },
  heroTitle: { type: String, default: 'Upgrade Your Ride' },
  heroSubtitle: {
    type: String,
    default: 'Accessoires auto premium sélectionnés — livrés partout dans le monde',
  },
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
})

export default mongoose.models.Settings ||
  mongoose.model<ISettings>('Settings', SettingsSchema)
