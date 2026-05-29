'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const num = orderNumber.trim()
    if (!num) { setError('Veuillez entrer votre numéro de commande.'); return }
    router.push(`/track/${encodeURIComponent(num)}?email=${encodeURIComponent(email.trim())}`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-20">
      <div className="text-center mb-10">
        <p className="text-[10px] tracking-[0.3em] uppercase text-brand-gold mb-2">Commandes</p>
        <h1 className="font-display text-3xl md:text-4xl text-brand-black mb-3">Suivre ma commande</h1>
        <p className="text-sm text-brand-gray">Entrez votre numéro de commande et votre email pour voir le statut en temps réel.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-[10px] tracking-[0.2em] uppercase text-brand-gray mb-2">
            Numéro de commande
          </label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Ex : MC-1234"
            className="w-full border border-brand-light-gray px-4 py-3 text-sm focus:outline-none focus:border-brand-black transition-colors"
          />
        </div>
        <div>
          <label className="block text-[10px] tracking-[0.2em] uppercase text-brand-gray mb-2">
            Email de commande
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            className="w-full border border-brand-light-gray px-4 py-3 text-sm focus:outline-none focus:border-brand-black transition-colors"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          className="flex items-center justify-center gap-2 bg-brand-black text-white px-8 py-4 text-xs tracking-[0.2em] uppercase font-semibold hover:bg-brand-gold hover:text-brand-black transition-colors duration-300"
        >
          <Search size={14} /> Suivre ma commande
        </button>
      </form>
    </div>
  )
}
