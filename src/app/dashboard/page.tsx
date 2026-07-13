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
  categorie: string | null
}

type ImpactRow = {
  numero: string
  ca_pendant: number
  clients_pendant: number
}

type Kpis = {
  nb_promos_2026: number
  ca_total: number
  clients_uniques: number
}

type UpliftRow = {
  numero: string
  marque: string
  uplift_pct: number | null
}

function formatMAD(n: number) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' MAD'
}
function formatCompact(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1000) {
    const val = n / 1000
    return (Number.isInteger(val) || abs >= 10000 ? val.toFixed(0) : val.toFixed(1)) + 'k'
  }
  return String(Math.round(n))
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function statutDe(dateFin: string) {
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  const fin = new Date(dateFin)
  return aujourdhui > fin ? 'Termine' : 'En cours'
}

const IconTag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M20.59 13.41L11 3.83 3.83 11l9.58 9.59a2 2 0 002.83 0l4.35-4.35a2 2 0 000-2.83z" />
    <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
  </svg>
)
const IconTrophy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M8 4h8v6a4 4 0 01-8 0V4z" />
    <path d="M8 4H4v2a4 4 0 004 4M16 4h4v2a4 4 0 01-4 4" />
    <path d="M12 14v3M9 21h6M9.5 17h5l.5 4h-6l.5-4z" />
  </svg>
)
const IconCoins = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <ellipse cx="12" cy="6" rx="7" ry="3" />
    <path d="M5 6v5c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
    <path d="M5 11v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" />
  </svg>
)
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    <circle cx="17" cy="9" r="2.6" />
    <path d="M15.5 14.2c2.8.4 4.5 2.4 4.5 5.8" />
  </svg>
)

export default function DashboardPage() {
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [impacts, setImpacts] = useState<Record<string, ImpactRow>>({})
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [meilleurePromo, setMeilleurePromo] = useState<UpliftRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')

  const [recherche, setRecherche] = useState('')
  const [filtreMarque, setFiltreMarque] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState('')
  const [filtreCible, setFiltreCible] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')

  useEffect(() => {
    const supabase = createClient()

    async function charger() {
      const [sum, imp, kp, up] = await Promise.all([
        supabase.from('promo_matching_summary').select('*'),
        supabase.from('promo_impact_sku').select('numero, ca_pendant, clients_pendant'),
        supabase.from('promo_kpis_globaux').select('*').maybeSingle(),
        supabase.from('promo_uplift_marque').select('*').order('uplift_pct', { ascending: false }),
      ])

      if (sum.error) setErreur(sum.error.message)
      else setSummaries((sum.data as Summary[]) || [])

      if (imp.data) {
        const map: Record<string, ImpactRow> = {}
        for (const r of imp.data as ImpactRow[]) map[r.numero] = r
        setImpacts(map)
      }

      if (kp.data) setKpis(kp.data as Kpis)

      if (up.data) {
        const meilleure = (up.data as UpliftRow[]).find((r) => r.uplift_pct !== null)
        if (meilleure) setMeilleurePromo(meilleure)
      }

      setLoading(false)
    }

    charger()
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
      if (filtreStatut && statutDe(s.date_fin) !== filtreStatut) return false
      return true
    })
  }, [summaries, recherche, filtreMarque, filtreCategorie, filtreCible, filtreStatut])

  const selectClass =
    'rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-700 outline-none focus:border-[#0057A8]'

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      <style>{`* { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }`}</style>

      <main className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">Dashboard</h1>

        {/* Bloc 4 : KPIs globaux */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl p-4" style={{ background: '#0057A814' }}>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-4 w-4" style={{ color: '#0057A8' }}>
                <IconTag />
              </span>
              <span className="text-xs font-semibold" style={{ color: '#0057A8' }}>
                Promos 2026
              </span>
            </div>
            <p className="text-2xl font-semibold" style={{ color: '#0057A8' }}>
              {kpis ? kpis.nb_promos_2026 : '-'}
            </p>
          </div>

          <div className="rounded-2xl p-4" style={{ background: '#15803D14' }}>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-4 w-4" style={{ color: '#15803D' }}>
                <IconTrophy />
              </span>
              <span className="text-xs font-semibold" style={{ color: '#15803D' }}>
                Meilleure promo
              </span>
            </div>
            <p className="text-lg font-semibold" style={{ color: '#15803D' }}>
              {meilleurePromo ? (
                <>
                  {meilleurePromo.numero}
                  <span className="ml-1 text-sm font-medium">
                    ({meilleurePromo.uplift_pct !== null && meilleurePromo.uplift_pct >= 0 ? '+' : ''}
                    {meilleurePromo.uplift_pct}%)
                  </span>
                </>
              ) : (
                '-'
              )}
            </p>
          </div>

          <div className="rounded-2xl p-4" style={{ background: '#7C3AED14' }}>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-4 w-4" style={{ color: '#7C3AED' }}>
                <IconCoins />
              </span>
              <span className="text-xs font-semibold" style={{ color: '#7C3AED' }}>
                CA genere
              </span>
            </div>
            <p className="text-2xl font-semibold" style={{ color: '#7C3AED' }}>
              {kpis ? formatCompact(kpis.ca_total) + ' MAD' : '-'}
            </p>
          </div>

          <div className="rounded-2xl p-4" style={{ background: '#B4530914' }}>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-4 w-4" style={{ color: '#B45309' }}>
                <IconUsers />
              </span>
              <span className="text-xs font-semibold" style={{ color: '#B45309' }}>
                Clients uniques
              </span>
            </div>
            <p className="text-2xl font-semibold" style={{ color: '#B45309' }}>
              {kpis ? kpis.clients_uniques : '-'}
            </p>
          </div>
        </div>

        {/* Bloc 5 : filtres horizontaux */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom ou numero de promo"
            className="min-w-[200px] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#0057A8]"
          />
          <select value={filtreMarque} onChange={(e) => setFiltreMarque(e.target.value)} className={selectClass}>
            <option value="">Marque</option>
            {marques.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select value={filtreCategorie} onChange={(e) => setFiltreCategorie(e.target.value)} className={selectClass}>
            <option value="">Categorie</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={filtreCible} onChange={(e) => setFiltreCible(e.target.value)} className={selectClass}>
            <option value="">Cible</option>
            {cibles.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} className={selectClass}>
            <option value="">Statut</option>
            <option value="En cours">En cours</option>
            <option value="Termine">Termine</option>
          </select>
          {(filtreMarque || filtreCategorie || filtreCible || filtreStatut || recherche) && (
            <button
              onClick={() => {
                setRecherche('')
                setFiltreMarque('')
                setFiltreCategorie('')
                setFiltreCible('')
                setFiltreStatut('')
              }}
              className="rounded-lg px-3 py-2 text-xs text-[#0057A8] hover:underline"
            >
              Reinitialiser
            </button>
          )}
        </div>

        {loading && <p className="text-sm text-gray-400">Chargement des promotions...</p>}
        {erreur && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">Erreur : {erreur}</p>
        )}
        {!loading && !erreur && filtrees.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
            <p className="text-sm text-gray-400">Aucune promotion ne correspond a cette recherche.</p>
          </div>
        )}

        {/* Bloc 6 : grille de cartes promos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrees.map((s) => {
            const statut = statutDe(s.date_fin)
            const impact = impacts[s.numero]
            return (
              <Link
                key={s.promo_id}
                href={`/dashboard/${s.numero}`}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-[#0067B8]/40"
              >
                <p className="text-xs font-semibold text-[#0057A8]">{s.numero}</p>
                <p className="mt-1 text-base font-semibold text-gray-900">{s.marque}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {formatDate(s.date_debut)} - {formatDate(s.date_fin)}
                </p>
                <span
                  className="mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={
                    statut === 'En cours'
                      ? { background: '#DCFCE7', color: '#166534' }
                      : { background: '#F3F4F6', color: '#374151' }
                  }
                >
                  {statut}
                </span>
                <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-xs">
                  <div>
                    <p className="text-gray-400">CA</p>
                    <p className="font-semibold text-gray-800">{impact ? formatMAD(impact.ca_pendant) : '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400">CLT</p>
                    <p className="font-semibold text-gray-800">{impact ? impact.clients_pendant : '-'}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
