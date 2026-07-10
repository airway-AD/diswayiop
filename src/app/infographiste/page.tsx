'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Promo = {
  id: string
  numero: string
  marque: string
  categorie: string | null
  date_debut: string
  date_fin: string
  statut: string | null
  assigne_a: string | null
}

type ProfileLite = {
  id: string
  nom: string | null
  email: string
}

const STATUTS = ['Nouvelle', 'En cours', 'Terminee', 'Live', 'Standby']

const STATUT_COLOR: Record<string, string> = {
  Nouvelle: '#0057A8',
  'En cours': '#B45309',
  Terminee: '#64748B',
  Live: '#15803D',
  Standby: '#94A3B8',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function InfographistePage() {
  const [promos, setPromos] = useState<Promo[]>([])
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')
  const [filtre, setFiltre] = useState<'nouvelles' | 'mes_promos' | 'toutes'>('nouvelles')
  const [maj, setMaj] = useState<string | null>(null)

  const charger = async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    setUserId(session?.user.id || null)

    const [promosRes, profilesRes] = await Promise.all([
      supabase
        .from('promos')
        .select('id, numero, marque, categorie, date_debut, date_fin, statut, assigne_a')
        .order('date_debut', { ascending: false }),
      supabase.from('profiles').select('id, nom, email'),
    ])

    if (promosRes.error) setErreur(promosRes.error.message)
    else setPromos((promosRes.data as Promo[]) || [])

    if (profilesRes.data) {
      const map: Record<string, ProfileLite> = {}
      for (const p of profilesRes.data as ProfileLite[]) map[p.id] = p
      setProfiles(map)
    }

    setLoading(false)
  }

  useEffect(() => {
    charger()
  }, [])

  const prendreEnCharge = async (id: string) => {
    if (!userId) return
    setMaj(id)
    const supabase = createClient()
    const { error } = await supabase
      .from('promos')
      .update({ assigne_a: userId, statut: 'En cours' })
      .eq('id', id)
    if (!error) {
      setPromos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, assigne_a: userId, statut: 'En cours' } : p))
      )
    }
    setMaj(null)
  }

  const changerStatut = async (id: string, statut: string) => {
    setMaj(id)
    const supabase = createClient()
    const { error } = await supabase.from('promos').update({ statut }).eq('id', id)
    if (!error) {
      setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, statut } : p)))
    }
    setMaj(null)
  }

  const promosFiltrees = useMemo(() => {
    if (filtre === 'nouvelles') return promos.filter((p) => !p.assigne_a)
    if (filtre === 'mes_promos') return promos.filter((p) => p.assigne_a === userId)
    return promos
  }, [promos, filtre, userId])

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      <style>{`* { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }`}</style>

      <header className="bg-[#0B1220] px-6 py-6 sm:px-10">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-wide text-white/40">DIOP - Infographiste</p>
          <h1 className="mt-1 text-xl font-bold text-white">Promotions</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 sm:px-10">
        <div className="mb-5 flex gap-2">
          {(
            [
              ['nouvelles', 'Nouvelles'],
              ['mes_promos', 'Mes promos'],
              ['toutes', 'Toutes'],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFiltre(val)}
              className={`rounded-full px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#0067B8] ${
                filtre === val ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-gray-400">Chargement...</p>}
        {erreur && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{erreur}</p>}

        {!loading && !erreur && (
          <div className="flex flex-col gap-3">
            {promosFiltrees.map((p) => {
              const assignee = p.assigne_a ? profiles[p.assigne_a] : null
              return (
                <div key={p.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[#0057A8] px-2.5 py-1 text-xs font-bold text-white">
                          {p.numero}
                        </span>
                        <p className="text-base font-semibold text-gray-900">{p.marque}</p>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        {p.categorie ? p.categorie + ' - ' : ''}
                        {formatDate(p.date_debut)} → {formatDate(p.date_fin)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                        style={{ background: STATUT_COLOR[p.statut || 'Nouvelle'] || '#64748B' }}
                      >
                        {p.statut || 'Nouvelle'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-400">
                      {assignee ? `Assignee a ${assignee.nom || assignee.email}` : 'Pas encore assignee'}
                    </p>

                    <div className="flex items-center gap-2">
                      {!p.assigne_a && (
                        <button
                          onClick={() => prendreEnCharge(p.id)}
                          disabled={maj === p.id}
                          className="rounded-full bg-[#0057A8] px-4 py-1.5 text-xs font-semibold text-white outline-none hover:bg-[#0067B8] focus-visible:ring-2 focus-visible:ring-[#0067B8] disabled:opacity-50"
                        >
                          Je m&apos;en occupe
                        </button>
                      )}
                      {(p.assigne_a === userId || filtre === 'toutes') && (
                        <select
                          value={p.statut || 'Nouvelle'}
                          disabled={maj === p.id}
                          onChange={(e) => changerStatut(p.id, e.target.value)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium outline-none focus:border-[#0057A8]"
                        >
                          {STATUTS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {promosFiltrees.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
                <p className="text-sm text-gray-400">Aucune promotion dans cette vue.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
