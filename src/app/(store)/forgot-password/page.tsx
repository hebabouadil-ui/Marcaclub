'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/customer/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) setSent(true)
      else { const d = await res.json(); setError(d.error || 'Erreur') }
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-brand-gold text-xs tracking-[0.4em] uppercase font-semibold">Marcaclub</Link>
          <h1 className="font-display text-3xl font-bold text-gray-900 tracking-widest uppercase mt-3 mb-2">
            Mot de passe oublié
          </h1>
          <p className="text-gray-500 text-sm">
            Entrez votre email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <div className="bg-white border border-gray-200 p-8 shadow-sm rounded-xl">
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <div className="text-5xl">📧</div>
              <p className="text-gray-900 font-semibold">Email envoyé !</p>
              <p className="text-gray-500 text-sm leading-relaxed">
                Si un compte est associé à <strong>{email}</strong>, vous recevrez un email avec un lien valable <strong>1 heure</strong>.<br />
                Pensez à vérifier vos spams.
              </p>
              <Link href="/account/login"
                className="inline-block mt-2 text-sm text-brand-gold hover:text-yellow-600 underline transition-colors">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-500 text-[10px] tracking-widest mb-2">ADRESSE EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="vous@exemple.com"
                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent rounded-lg placeholder:text-gray-400"
                />
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-black text-white font-bold py-3.5 text-sm tracking-widest uppercase flex items-center justify-center hover:bg-brand-gold hover:text-brand-black transition-colors disabled:opacity-50 rounded-lg"
              >
                {loading ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
              </button>
              <p className="text-center text-sm text-gray-400">
                <Link href="/account/login" className="hover:text-gray-600 underline transition-colors">
                  Retour à la connexion
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
