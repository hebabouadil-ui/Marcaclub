'use client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { Suspense } from 'react'
import InstagramIcon from '@/components/ui/InstagramIcon'

function ConfirmationContent() {
  const params = useSearchParams()
  const orderNumber = params.get('order')

  return (
    <div className="pt-20 min-h-screen flex items-center justify-center px-4">
      <div className="max-w-xl w-full text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="mb-8"
        >
          <CheckCircle size={64} className="text-green-500 mx-auto" strokeWidth={1.5} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-[10px] tracking-[0.3em] text-brand-gold uppercase mb-3">Commande confirmée</p>
          <h1 className="font-display text-3xl md:text-5xl text-brand-black mb-4">
            Merci pour votre commande !
          </h1>

          {orderNumber && (
            <div className="bg-brand-light-gray py-4 px-6 my-6 inline-block">
              <p className="text-xs tracking-widest uppercase text-brand-gray">Numéro de commande</p>
              <p className="text-xl font-bold text-brand-black mt-1">{orderNumber}</p>
            </div>
          )}

          <div className="bg-brand-black text-brand-white/80 p-6 my-6 text-left space-y-2">
            <p className="text-sm">✓ Votre commande a été confirmée avec succès.</p>
            <p className="text-sm">
              ✓ Livraison sous <strong className="text-brand-gold">2 jours environ</strong> selon votre ville.
            </p>
            <p className="text-sm">✓ Paiement à la réception (Cash on Delivery).</p>
            <p className="text-sm">✓ Un email de confirmation vous a été envoyé si fourni.</p>
          </div>

          <p className="text-brand-gray text-sm mb-8">
            Pour toute question, contactez-nous directement sur Instagram.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 bg-brand-black text-brand-white px-8 py-4 text-xs tracking-[0.2em] uppercase hover:bg-brand-gold hover:text-brand-black transition-colors"
            >
              Continuer les achats <ArrowRight size={14} />
            </Link>
            <a
              href="https://instagram.com/marcaclub"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-brand-light-gray text-brand-black px-8 py-4 text-xs tracking-[0.2em] uppercase hover:border-brand-black transition-colors"
            >
              <InstagramIcon size={14} />
              @marcaclub
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-20 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full" /></div>}>
      <ConfirmationContent />
    </Suspense>
  )
}
