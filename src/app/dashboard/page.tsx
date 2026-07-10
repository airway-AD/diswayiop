'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Summary = {
  promo_id: string
  numero: string
  marque: string
  cible_promo: string[]
  date_debut: string
  date_fin: string
  nb_conforme: number
  nb_prix_non_conforme: number
  nb_hors_cible: number
  nb_non_disponible: number
  ca_conforme: number
  ca_prix_non_conforme: number
  ca_hors_cible: number
  ca_non_disponible: number
  categorie: string | null
  sous_familles: string[] | null
  statut: string | null
}

const STATUT_COLOR: Record<string, string> = {
  Nouvelle: '#0057A8',
  'En cours': '#B45309',
  Terminee: '#64748B',
  Live: '#15803D',
  Standby: '#94A3B8',
}

function formatMAD(n: number) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' MAD'
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function DashboardPage() {
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')
  const [recherche, setRecherche] = useState('')
  const [filtreMarque, setFiltreMarque] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState('')
  const [filtreCible, setFiltreCible] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('promo_matching_summary')
      .select('*')
      .then(({ data, error }) => {
        if (error) setErreur(error.message)
        else setSummaries((data as Summary[]) || [])
        setLoading(false)
      })
  }, [])

  const marques = useMemo(
    () => Array.from(new Set(summaries.map((s) => s.marque).filter(Boolean))).sort(),
    [summaries]
  )
  const categories = useMemo(
    () => Array.from(new Set(summaries.map((s) => s.categorie).filter(Boolean))).sort() as string[],
    [summaries]
  )
  const cibles = useMemo(
    () => Array.from(new Set(summaries.flatMap((s) => s.cible_promo || []))).sort(),
    [summaries]
  )

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return summaries.filter((s) => {
      if (q && !s.numero.toLowerCase().includes(q) && !s.marque.toLowerCase().includes(q)) return false
      if (filtreMarque && s.marque !== filtreMarque) return false
      if (filtreCategorie && s.categorie !== filtreCategorie) return false
      if (filtreCible && !(s.cible_promo || []).includes(filtreCible)) return false
      return true
    })
  }, [summaries, recherche, filtreMarque, filtreCategorie, filtreCible])

  return (
    <div className="min-h-screen" style={{ background: '#F5F6F8' }}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap"
      />
      <style>{`
        .diop-display { font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif; }
        .diop-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .diop-mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace; font-variant-numeric: tabular-nums; }
      `}</style>

      <header style={{ background: '#0B1220' }} className="px-6 py-6 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="diop-mono text-[11px] uppercase tracking-[0.25em] text-white/40">
              DIOP · Reporting
            </p>
            <h1 className="diop-display mt-1 text-2xl font-semibold text-white">
              Suivi des promotions
            </h1>
          </div>
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un numero (26/...) ou une marque"
            className="diop-mono w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus-visible:ring-2 focus-visible:ring-[#0067B8] sm:w-80"
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
        <div className="mb-5 flex flex-wrap gap-2">
          <select
            value={filtreMarque}
            onChange={(e) => setFiltreMarque(e.target.value)}
            className="diop-body rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0057A8]"
          >
            <option value="">Toutes marques</option>
            {marques.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={filtreCategorie}
            onChange={(e) => setFiltreCategorie(e.target.value)}
            className="diop-body rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0057A8]"
          >
            <option value="">Toutes categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={filtreCible}
            onChange={(e) => setFiltreCible(e.target.value)}
            className="diop-body rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0057A8]"
          >
            <option value="">Toutes cibles</option>
            {cibles.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {(filtreMarque || filtreCategorie || filtreCible) && (
            <button
              onClick={() => {
                setFiltreMarque('')
                setFiltreCategorie('')
                setFiltreCible('')
              }}
              className="diop-body rounded-lg px-3 py-2 text-xs text-[#0057A8] hover:underline"
            >
              Reinitialiser
            </button>
          )}
        </div>

        {loading && <p className="diop-body text-sm text-gray-400">Chargement des promotions...</p>}

        {erreur && (
          <p className="diop-body rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            Erreur : {erreur}
          </p>
        )}

        {!loading && !erreur && filtrees.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
            <p className="diop-body text-sm text-gray-400">
              Aucune promotion ne correspond a cette recherche.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {filtrees.map((s) => {
            const nbNonDisponible = s.nb_non_disponible || 0
            const caNonDisponible = s.ca_non_disponible || 0
            const total = s.nb_conforme + s.nb_prix_non_conforme + s.nb_hors_cible + nbNonDisponible
            const caTotal = s.ca_conforme + s.ca_prix_non_conforme + s.ca_hors_cible + caNonDisponible
            const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0)

            return (
              <Link
                key={s.promo_id}
                href={`/dashboard/${s.numero}`}
                className="block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-[#0067B8]/40"
              >
                <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <span
                      className="diop-mono rounded-md px-2.5 py-1 text-sm font-semibold text-white"
                      style={{ background: '#0057A8' }}
                    >
                      {s.numero}
                    </span>
                    <div>
                      {(s.categorie || (s.sous_familles && s.sous_familles.length > 0)) && (
                        <p className="diop-body text-[11px] uppercase tracking-wide text-gray-400">
                          {s.categorie || ''}
                          {s.categorie && s.sous_familles?.length ? ' -> ' : ''}
                          {s.sous_familles?.join(', ') || ''}
                        </p>
                      )}
                      <p className="diop-display text-base font-semibold text-gray-900">{s.marque}</p>
                      <p className="diop-body text-xs text-gray-400">
                        {formatDate(s.date_debut)} → {formatDate(s.date_fin)} · cible{' '}
                        {s.cible_promo?.join(', ') || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.statut && (
                      <span
                        className="diop-body rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                        style={{ background: STATUT_COLOR[s.statut] || '#64748B' }}
                      >
                        {s.statut}
                      </span>
                    )}
                    <p className="diop-mono text-sm font-medium text-gray-700">{formatMAD(caTotal)}</p>
                    <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                <div className="px-6 pb-5">
                  {total === 0 ? (
                    <p className="diop-body text-xs text-gray-400">
                      Aucune vente enregistree sur cette periode pour ces SKUs.
                    </p>
                  ) : (
                    <>
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                        {s.nb_conforme > 0 && (
                          <div style={{ width: pct(s.nb_conforme) + '%', background: '#15803D' }} />
                        )}
                        {s.nb_prix_non_conforme > 0 && (
                          <div style={{ width: pct(s.nb_prix_non_conforme) + '%', background: '#B91C1C' }} />
                        )}
                        {s.nb_hors_cible > 0 && (
                          <div style={{ width: pct(s.nb_hors_cible) + '%', background: '#B45309' }} />
                        )}
                        {nbNonDisponible > 0 && (
                          <div style={{ width: pct(nbNonDisponible) + '%', background: '#CBD5E1' }} />
                        )}
                      </div>
                      <div className="mt-3">
                        <span className="diop-body flex w-fit items-center gap-1.5 text-xs text-gray-600">
                          <span className="h-2 w-2 rounded-full" style={{ background: '#B91C1C' }} />
                          {s.nb_prix_non_conforme} hors prix promo
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
