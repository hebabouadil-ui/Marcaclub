'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const faqs = [
  {
    q: 'Comment suivre ma commande ?',
    a: 'Une fois votre commande expédiée, vous recevrez un email avec votre numéro de suivi. Vous pouvez également suivre votre commande directement sur notre page Suivi de commande en entrant votre numéro de commande et votre email.',
  },
  {
    q: 'Quels sont les délais de livraison ?',
    a: 'Les délais varient selon votre pays : Canada & USA : 7–12 jours ouvrables · Europe (FR, BE, CH…) : livraison express · Afrique du Nord (MA, DZ, TN…) : livraison internationale avec suivi · Reste du monde : livraison mondiale disponible. Aucun délai précis n\'est garanti pour les pays hors Amérique du Nord.',
  },
  {
    q: 'Comment retourner un produit ?',
    a: 'Nous acceptons les retours sous 14 jours après réception, à condition que le produit soit non ouvert et dans son emballage d\'origine. Contactez-nous via WhatsApp ou par email pour initier un retour. Les frais de retour sont à la charge du client.',
  },
  {
    q: 'Quels modes de paiement sont acceptés ?',
    a: 'Nous acceptons les cartes Visa, Mastercard, PayPal et CB. Tous les paiements sont traités de manière sécurisée via notre prestataire de paiement certifié.',
  },
  {
    q: 'Le paiement est-il sécurisé ?',
    a: 'Oui, 100%. Toutes vos informations de paiement sont chiffrées et sécurisées. Nous ne stockons jamais vos données bancaires. Notre site utilise le protocole SSL (cadenas vert dans votre navigateur).',
  },
  {
    q: "Je n'ai pas reçu ma commande, que faire ?",
    a: "Si vous n'avez pas reçu votre commande dans les délais indiqués, vérifiez d'abord votre email de confirmation pour le numéro de suivi. Ensuite, suivez votre colis sur notre page Suivi de commande. Si le problème persiste, contactez-nous directement via WhatsApp ou email — nous résoudrons cela rapidement.",
  },
  {
    q: 'Puis-je modifier ou annuler ma commande ?',
    a: "Vous pouvez modifier ou annuler votre commande dans les 2 heures suivant sa passation en nous contactant immédiatement via WhatsApp. Passé ce délai, la commande est transmise pour expédition et ne peut plus être modifiée.",
  },
  {
    q: 'Les produits sont-ils authentiques ?',
    a: 'Tous nos produits sont sélectionnés rigoureusement auprès de fournisseurs certifiés. Nous garantissons la qualité et l\'authenticité de chaque article vendu sur Marcaclub.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-brand-light-gray">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left text-sm font-medium text-brand-black hover:text-brand-gold transition-colors"
      >
        <span>{q}</span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-brand-gray transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm text-brand-gray leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FaqPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="mb-10">
        <p className="text-[10px] tracking-[0.3em] uppercase text-brand-gold mb-2">Support</p>
        <h1 className="font-display text-3xl md:text-4xl text-brand-black mb-3">Questions fréquentes</h1>
        <p className="text-sm text-brand-gray">
          Une question ? Vous trouverez sûrement la réponse ici. Sinon,{' '}
          <a href="https://wa.me/212695504949?text=Bonjour%2C+j%27ai+une+question+sur+Marca+Club+%F0%9F%92%AC" target="_blank" rel="noopener noreferrer" className="text-brand-gold hover:underline">
            contactez-nous sur WhatsApp
          </a>.
        </p>
      </div>

      <div className="divide-y divide-brand-light-gray border-t border-brand-light-gray">
        {faqs.map((item) => (
          <FaqItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>

      <div className="mt-12 p-6 bg-brand-light-gray/50 border border-brand-light-gray text-center">
        <p className="text-sm text-brand-gray mb-3">Vous n&apos;avez pas trouvé votre réponse ?</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="https://wa.me/212695504949?text=Bonjour%2C+j%27ai+une+question+sur+Marca+Club+%F0%9F%92%AC"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white px-6 py-3 text-xs tracking-widest uppercase font-semibold hover:bg-green-500 transition-colors"
          >
            WhatsApp
          </a>
          <Link
            href="/track"
            className="inline-flex items-center justify-center gap-2 border border-brand-black text-brand-black px-6 py-3 text-xs tracking-widest uppercase font-semibold hover:bg-brand-black hover:text-white transition-colors"
          >
            Suivre ma commande
          </Link>
        </div>
      </div>
    </div>
  )
}
