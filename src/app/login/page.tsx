'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)

  const connecter = async () => {
    if (!motDePasse.trim()) return
    setLoading(true)
    setErreur('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: motDePasse }),
    })
    const data = await res.json()
    setLoading(false)

    if (!data.ok) {
      setErreur('Mot de passe incorrect')
      return
    }

    if (data.role === 'admin' || data.role === 'marcom') {
      router.push('/dashboard')
    } else if (data.role === 'infographiste') {
      router.push('/infographiste')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F6F8] px-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">DIOP</p>
        <h1 className="mt-1 text-xl font-bold text-gray-900">Salut</h1>
        <p className="mb-6 mt-1 text-sm text-gray-500">Veuillez saisir votre mot de passe.</p>
        <input
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && connecter()}
          placeholder="Mot de passe"
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#0057A8]"
          autoFocus
        />
        <button
          onClick={connecter}
          disabled={loading}
          className="mt-4 w-full rounded-full bg-[#0057A8] py-3 text-sm font-semibold text-white transition hover:bg-[#0067B8] disabled:opacity-50"
        >
          {loading ? 'Verification...' : 'Entrer'}
        </button>
        {erreur && <p className="mt-3 text-xs text-red-600">{erreur}</p>}
      </div>
    </div>
  )
}