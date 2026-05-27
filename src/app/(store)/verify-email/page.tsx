'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function VerifyContent() {
  const params = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Lien invalide.'); return }
    fetch(`/api/auth/customer/verify-email?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) setStatus('success')
        else { setStatus('error'); setMessage(d.error || 'Lien invalide ou expiré.') }
      })
      .catch(() => { setStatus('error'); setMessage('Erreur réseau.') })
  }, [token])

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-brand-gold text-xs tracking-[0.4em] uppercase font-semibold">Marcaclub</Link>
        </div>
        <div className="bg-white border border-gray-200 p-8 shadow-sm rounded-xl text-center space-y-4">
          {status === 'loading' && (
            <>
              <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-500 text-sm">Vérification en cours…</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="font-bold text-gray-900 text-xl">Compte activé !</h1>
              <p className="text-gray-500 text-sm">Votre adresse email a été confirmée. Vous pouvez maintenant vous connecter.</p>
              <Link href="/account/login"
                className="inline-block mt-2 bg-brand-black text-white font-bold py-3 px-8 text-sm tracking-widest uppercase hover:bg-brand-gold hover:text-brand-black transition-colors rounded-lg">
                Se connecter
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="font-bold text-gray-900 text-xl">Lien invalide</h1>
              <p className="text-gray-500 text-sm">{message}</p>
              <Link href="/account/login"
                className="inline-block mt-2 text-sm text-brand-gold hover:text-yellow-600 underline transition-colors">
                Retour à la connexion
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  )
}
