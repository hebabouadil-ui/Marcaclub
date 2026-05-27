'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) setError('Lien invalide. Veuillez refaire une demande de réinitialisation.')
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/customer/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur'); return }
      setDone(true)
      setTimeout(() => router.push('/'), 3000)
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-brand-gold text-xs tracking-[0.4em] uppercase font-semibold">Marcaclub</Link>
          <h1 className="text-2xl font-semibold text-brand-black mt-3 mb-2">Nouveau mot de passe</h1>
          <p className="text-brand-gray text-sm">Choisissez un mot de passe sécurisé pour votre compte.</p>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="text-4xl">✅</div>
            <p className="text-brand-black font-medium">Mot de passe mis à jour !</p>
            <p className="text-brand-gray text-sm">Vous allez être redirigé vers l&apos;accueil…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-widest uppercase text-brand-gray mb-1.5">Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Au moins 8 caractères"
                className="w-full border border-gray-200 px-3 py-3 text-sm focus:outline-none focus:border-brand-black transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-widest uppercase text-brand-gray mb-1.5">Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Répétez le mot de passe"
                className="w-full border border-gray-200 px-3 py-3 text-sm focus:outline-none focus:border-brand-black transition-colors"
              />
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading || !token}
              className="w-full bg-brand-black text-white py-3 text-xs tracking-widest uppercase font-semibold hover:bg-brand-gold hover:text-brand-black transition-colors disabled:opacity-50"
            >
              {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
            </button>
            <p className="text-center text-xs text-brand-gray mt-2">
              <Link href="/" className="underline hover:text-brand-black transition-colors">Retour à l&apos;accueil</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
