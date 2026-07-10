'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Profile = {
  id: string
  email: string
  nom: string | null
  role: 'admin' | 'marcom' | 'cdp' | 'infographiste' | 'lecture' | null
  created_at: string
}

const ROLES = ['admin', 'marcom', 'cdp', 'infographiste', 'lecture'] as const

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function UtilisateursPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')
  const [maj, setMaj] = useState<string | null>(null)

  const charger = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setErreur(error.message)
    else setProfiles((data as Profile[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    charger()
  }, [])

  const changerRole = async (id: string, role: string) => {
    setMaj(id)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ role: role === '' ? null : role })
      .eq('id', id)
    if (!error) {
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role: role === '' ? null : (role as Profile['role']) } : p)))
    }
    setMaj(null)
  }

  const changerNom = async (id: string, nom: string) => {
    const supabase = createClient()
    await supabase.from('profiles').update({ nom }).eq('id', id)
  }

  const enAttente = profiles.filter((p) => !p.role)
  const actifs = profiles.filter((p) => p.role)

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <header className="bg-[#0B1220] px-6 py-6 sm:px-10">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-wide text-white/40">DIOP - Admin</p>
          <h1 className="mt-1 text-xl font-bold text-white">Gestion des utilisateurs</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 sm:px-10">
        {loading && <p className="text-sm text-gray-400">Chargement...</p>}
        {erreur && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{erreur}</p>}

        {!loading && !erreur && (
          <>
            {enAttente.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-sm font-semibold text-gray-900">
                  En attente d&apos;activation
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    {enAttente.length}
                  </span>
                </h2>
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                  {enAttente.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.email}</p>
                        <p className="text-xs text-gray-400">Cree le {formatDate(p.created_at)}</p>
                      </div>
                      <select
                        defaultValue=""
                        disabled={maj === p.id}
                        onChange={(e) => changerRole(p.id, e.target.value)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-[#0057A8]"
                      >
                        <option value="" disabled>
                          Attribuer un role...
                        </option>
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2 className="mb-3 text-sm font-semibold text-gray-900">Comptes actifs</h2>
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-5 py-3">Nom</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Depuis</th>
                  </tr>
                </thead>
                <tbody>
                  {actifs.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="px-5 py-3">
                        <input
                          defaultValue={p.nom || ''}
                          placeholder="Nom"
                          onBlur={(e) => changerNom(p.id, e.target.value)}
                          className="w-full rounded-md border border-transparent px-2 py-1 text-sm outline-none hover:border-gray-200 focus:border-[#0057A8]"
                        />
                      </td>
                      <td className="px-5 py-3 text-gray-600">{p.email}</td>
                      <td className="px-5 py-3">
                        <select
                          value={p.role || ''}
                          disabled={maj === p.id}
                          onChange={(e) => changerRole(p.id, e.target.value)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium outline-none focus:border-[#0057A8]"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400">{formatDate(p.created_at)}</td>
                    </tr>
                  ))}
                  {actifs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-xs text-gray-400">
                        Aucun compte actif pour l&apos;instant.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
