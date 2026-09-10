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
  assigne_a_nom: string | null
  date_prise_en_charge: string | null
  date_validation: string | null
  date_envoi: string | null
}

const STATUT_META: Record<string, { label: string; color: string }> = {
  nouvelle: { label: 'Nouvelle', color: '#64748B' },
  en_crea: { label: 'En crea', color: '#B45309' },
  validee: { label: 'Validee', color: '#0067B8' },
  envoyee: { label: 'Envoyee', color: '#15803D' },
  terminee: { label: 'Terminee', color: '#0B1220' },
  standby: { label: 'Standby', color: '#94A3B8' },
}

const CHAMPS =
  'id, numero, marque, categorie, date_debut, date_fin, statut, assigne_a_nom, date_prise_en_charge, date_validation, date_envoi'

function getCookie(name: string) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDuree(ms: number) {
  if (ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const j = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (j > 0) return `${j}j ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Le passage en "terminee" est calcule a l'affichage, pas stocke en base.
function statutAffiche(p: Promo) {
  const base = p.statut || 'nouvelle'
  if (base === 'envoyee') {
    const aujourdhui = new Date().toISOString().slice(0, 10)
    if (p.date_fin && p.date_fin < aujourdhui) return 'terminee'
  }
  return base
}

function Chrono({ p, now }: { p: Promo; now: number }) {
  if (!p.date_prise_en_charge) return null

  const debut = new Date(p.date_prise_en_charge).getTime()
  const validation = p.date_validation ? new Date(p.date_validation).getTime() : null
  const envoi = p.date_envoi ? new Date(p.date_envoi).getTime() : null

  const tempsCrea = (validation ?? now) - debut
  const tempsEnvoi = validation ? (envoi ?? now) - validation : null
  const enCours = !envoi

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
      <span className="rounded-lg bg-gray-50 px-2.5 py-1 font-medium text-gray-600">
        Crea{' '}
        <span className={`font-mono ${!validation ? 'text-[#B45309]' : 'text-gray-900'}`}>
          {formatDuree(tempsCrea)}
        </span>
      </span>

      {tempsEnvoi !== null && (
        <span className="rounded-lg bg-gray-50 px-2.5 py-1 font-medium text-gray-600">
          Validation vers envoi{' '}
          <span className={`font-mono ${!envoi ? 'text-[#0067B8]' : 'text-gray-900'}`}>
            {formatDuree(tempsEnvoi)}
          </span>
        </span>
      )}

      {envoi && (
        <span className="rounded-lg bg-[#F0FDF4] px-2.5 py-1 font-medium text-[#15803D]">
          Total {formatDuree(envoi - debut)}
        </span>
      )}

      {enCours && (
        <span className="flex items-center gap-1.5 text-gray-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#B45309]" />
          en cours
        </span>
      )}
    </div>
  )
}

export default function InfographistePage() {
  const [promos, setPromos] = useState<Promo[]>([])
  const [nom, setNom] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')
  const [filtre, setFiltre] = useState<'nouvelles' | 'mes_promos' | 'toutes'>('nouvelles')
  const [maj, setMaj] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Horloge locale : fait avancer les chronos sans requete serveur.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const charger = async () => {
    const supabase = createClient()
    setNom(getCookie('diop_nom'))

    const { data, error } = await supabase
      .from('promos')
      .select(CHAMPS)
      .order('date_debut', { ascending: false })

    if (error) setErreur(error.message)
    else setPromos((data as Promo[]) || [])

    setLoading(false)
  }

  useEffect(() => {
    charger()
  }, [])

  const appliquer = async (id: string, patch: Partial<Promo>) => {
    setMaj(id)
    const supabase = createClient()
    const { error } = await supabase.from('promos').update(patch).eq('id', id)
    if (error) setErreur(error.message)
    else setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    setMaj(null)
  }

  const prendreEnCharge = (id: string) =>
    appliquer(id, {
      statut: 'en_crea',
      assigne_a_nom: nom || 'Admin',
      date_prise_en_charge: new Date().toISOString(),
    })

  const validerParCdp = (id: string) =>
    appliquer(id, { statut: 'validee', date_validation: new Date().toISOString() })

  const marquerEnvoyee = (id: string) =>
    appliquer(id, { statut: 'envoyee', date_envoi: new Date().toISOString() })

  // Retour en arriere d'une seule etape, en effacant l'horodatage correspondant.
  const annulerEtape = (p: Promo) => {
    if (p.statut === 'envoyee') return appliquer(p.id, { statut: 'validee', date_envoi: null })
    if (p.statut === 'validee') return appliquer(p.id, { statut: 'en_crea', date_validation: null })
    if (p.statut === 'en_crea')
      return appliquer(p.id, {
        statut: 'nouvelle',
        assigne_a_nom: null,
        date_prise_en_charge: null,
      })
  }

  const promosFiltrees = useMemo(() => {
    if (filtre === 'nouvelles') return promos.filter((p) => (p.statut || 'nouvelle') === 'nouvelle')
    if (filtre === 'mes_promos') return promos.filter((p) => p.assigne_a_nom === nom)
    return promos
  }, [promos, filtre, nom])

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      />
      <style>{`* { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }`}</style>

      <header className="bg-[#0B1220] px-6 py-6 sm:px-10">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs uppercase tracking-wide text-white/40">DIOP - Infographiste</p>
          <h1 className="mt-1 text-xl font-bold text-white">Promotions</h1>
          {nom && <p className="mt-1 text-xs text-white/50">Connecte en tant que {nom}</p>}
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
                filtre === val
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 bg-white text-gray-500'
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
              const affiche = statutAffiche(p)
              const meta = STATUT_META[affiche] || STATUT_META.nouvelle
              const brut = p.statut || 'nouvelle'
              const estMienne = p.assigne_a_nom === nom
              const peutAgir = estMienne || filtre === 'toutes'
              const occupe = maj === p.id

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                >
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
                        {formatDate(p.date_debut)} vers {formatDate(p.date_fin)}
                      </p>
                    </div>

                    <span
                      className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                      style={{ background: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <Chrono p={p} now={now} />

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-400">
                      {p.assigne_a_nom ? `Assignee a ${p.assigne_a_nom}` : 'Pas encore assignee'}
                    </p>

                    <div className="flex items-center gap-2">
                      {brut === 'nouvelle' && (
                        <button
                          onClick={() => prendreEnCharge(p.id)}
                          disabled={occupe}
                          className="rounded-full bg-[#0057A8] px-4 py-1.5 text-xs font-semibold text-white outline-none hover:bg-[#0067B8] focus-visible:ring-2 focus-visible:ring-[#0067B8] disabled:opacity-50"
                        >
                          Je m&apos;en occupe
                        </button>
                      )}

                      {brut === 'en_crea' && peutAgir && (
                        <button
                          onClick={() => validerParCdp(p.id)}
                          disabled={occupe}
                          className="rounded-full bg-[#0067B8] px-4 py-1.5 text-xs font-semibold text-white outline-none hover:bg-[#0057A8] focus-visible:ring-2 focus-visible:ring-[#0067B8] disabled:opacity-50"
                        >
                          Valide par le CDP
                        </button>
                      )}

                      {brut === 'validee' && peutAgir && (
                        <button
                          onClick={() => marquerEnvoyee(p.id)}
                          disabled={occupe}
                          className="rounded-full bg-[#15803D] px-4 py-1.5 text-xs font-semibold text-white outline-none hover:bg-[#166534] focus-visible:ring-2 focus-visible:ring-[#15803D] disabled:opacity-50"
                        >
                          Envoyee
                        </button>
                      )}

                      {peutAgir && ['en_crea', 'validee', 'envoyee'].includes(brut) && (
                        <button
                          onClick={() => annulerEtape(p)}
                          disabled={occupe}
                          title="Revenir a l'etape precedente"
                          className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 outline-none hover:bg-gray-50 disabled:opacity-50"
                        >
                          Annuler
                        </button>
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
