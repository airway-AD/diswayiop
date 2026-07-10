'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function EnAttentePage() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F5F6F8] px-6 text-center">
      <p className="text-sm font-semibold text-gray-900">Compte en attente d&apos;activation</p>
      <p className="max-w-sm text-xs text-gray-400">
        Ton compte a bien ete cree, mais aucun role ne t&apos;a encore ete attribue. Contacte Ryad pour qu&apos;il
        active ton acces.
      </p>
      <button onClick={handleLogout} className="mt-2 text-xs text-[#0057A8] hover:underline">
        Se deconnecter
      </button>
    </div>
  )
}
