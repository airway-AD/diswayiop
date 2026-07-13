'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Meta = {
  promo_id: string
  numero: string
  marque: string
  categorie: string | null
  cible: string[]
  date_debut: string
  date_fin: string
}

type Equipe = {
  cdp: string | null
  assigne_a_nom: string | null
  envoi_nl: string | null
}

type ImpactSku = {
  ca_baseline_total: number
  ca_pendant: number
  qte_baseline_total: number
  qte_pendant: number
  clients_baseline: number
  clients_pendant: number
}

type ImpactFamille = {
  ca_baseline_famille: number
  ca_pendant_famille: number
  clients_baseline_famille: number
  clients_pendant_famille: number
}

type ImpactCible = {
  cible: string
  ca_pendant: number
  clients_pendant: number
}

type SemaineRow = {
  semaine_offset: number
  pendant_promo?: boolean
  ca: number
  clients: number
}

type SkuTableRow = {
  ref: string
  prix_promo: number | null
  prix_catalogue: number | null
  ca_avant: number
  qte_avant: number
  clients_avant: number
  ca_pendant: number
  qte_pendant: number
  clients_pendant: number
  nb_hors_prix: number
}

type DetailRow = {
  ref: string
  prix_attendu: number
  client_id: string
  cible_client: string | null
  date_vente: string
  quantite: number
  montant_ca: number
  prix_reel: number | null
  statut: string
}

type Categorie = 'ventes' | 'mailchimp' | 'ga4' | 'stock'

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
function formatDateHeure(d: string) {
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function pctUplift(avant: number, pendant: number): number | null {
  if (avant > 0) return ((pendant - avant) / avant) * 100
  if (pendant > 0) return null
  return 0
}
function UpliftBadge({ avant, pendant }: { avant: number; pendant: number }) {
  const p = pctUplift(avant, pendant)
  if (p === null) {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
        nouveau
      </span>
    )
  }
  const positif = p >= 0
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        background: positif ? '#DCFCE7' : '#FEE2E2',
        color: positif ? '#166534' : '#991B1B',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {positif ? '+' : ''}
      {p.toFixed(1)}%
    </span>
  )
}
function weekLabel(offset: number) {
  return offset < 0 ? `W${offset}` : `PW${offset + 1}`
}

const IconCoins = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <ellipse cx="12" cy="6" rx="7" ry="3" />
    <path d="M5 6v5c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
    <path d="M5 11v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5" />
  </svg>
)
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
)
const IconChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M4 20V10M12 20V4M20 20v-7" />
  </svg>
)
const IconArchive = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <path d="M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
    <path d="M10 12h4" />
  </svg>
)
const IconChevron = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
  </svg>
)
const IconCopy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 012-2h10" />
  </svg>
)
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
  </svg>
)
const IconPalette = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="8.5" cy="10.5" r="1.2" fill="currentColor" />
    <circle cx="12" cy="8" r="1.2" fill="currentColor" />
    <circle cx="15.5" cy="10.5" r="1.2" fill="currentColor" />
  </svg>
)
const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
)

const NAV_ITEMS: { id: Categorie; label: string; icon: React.ReactNode; accent: string; disabled?: boolean }[] = [
  { id: 'ventes', label: 'Ventes', icon: <IconCoins />, accent: '#0057A8' },
  { id: 'mailchimp', label: 'Mailchimp', icon: <IconMail />, accent: '#F59E0B' },
  { id: 'ga4', label: 'Google Analytics', icon: <IconChart />, accent: '#EA580C' },
  { id: 'stock', label: 'Stock', icon: <IconArchive />, accent: '#64748B', disabled: true },
]

const CIBLE_COLORS: Record<string, string> = {
  SMB: '#0057A8',
  GC: '#15803D',
  SD: '#7C3AED',
  Retail: '#EA580C',
  GD: '#0891B2',
  GR: '#B45309',
}

export default function PromoDetailPage({ params }: { params: Promise<{ numero: string[] }> }) {
  const { numero: numeroSegments } = use(params)
  const numero = numeroSegments.join('/')

  const [meta, setMeta] = useState<Meta | null>(null)
  const [equipe, setEquipe] = useState<Equipe | null>(null)
  const [impactSku, setImpactSku] = useState<ImpactSku | null>(null)
  const [impactFamille, setImpactFamille] = useState<ImpactFamille | null>(null)
  const [impactCible, setImpactCible] = useState<ImpactCible[]>([])
  const [semaineSku, setSemaineSku] = useState<SemaineRow[]>([])
  const [skuTable, setSkuTable] = useState<SkuTableRow[]>([])
  const [horsPrix, setHorsPrix] = useState<DetailRow[]>([])
  const [derniereMaj, setDerniereMaj] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')

  const [categorie, setCategorie] = useState<Categorie>('ventes')
  const [refFiltre, setRefFiltre] = useState<string | null>(null)
  const [horsPrixOuvert, setHorsPrixOuvert] = useState(false)
  const [cibleSurvolee, setCibleSurvolee] = useState<string | null>(null)
  const [lienCopie, setLienCopie] = useState(false)
  const [survolSemaine, setSurvolSemaine] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function charger() {
      const { data: metaData, error: metaErr } = await supabase
        .from('promo_meta')
        .select('*')
        .eq('numero', numero)
        .maybeSingle()

      if (metaErr || !metaData) {
        setErreur(metaErr?.message || 'Promotion introuvable')
        setLoading(false)
        return
      }
      setMeta(metaData as Meta)
      const promoId = (metaData as Meta).promo_id

      const [eq, impSku, impFam, impCib, semSku, table, hp, maj] = await Promise.all([
        supabase.from('promos').select('cdp, assigne_a_nom, envoi_nl').eq('id', promoId).maybeSingle(),
        supabase.from('promo_impact_sku').select('*').eq('numero', numero).maybeSingle(),
        supabase.from('promo_impact_famille').select('*').eq('numero', numero).maybeSingle(),
        supabase.from('promo_impact_cible').select('*').eq('numero', numero),
        supabase.from('promo_semaine_sku').select('*').eq('numero', numero),
        supabase.from('promo_sku_table').select('*').eq('numero', numero),
        supabase
          .from('promo_matching_detail')
          .select('*')
          .eq('promo_id', promoId)
          .eq('statut', 'prix_non_conforme')
          .order('date_vente', { ascending: false }),
        supabase.from('ventes_nav').select('uploaded_at').order('uploaded_at', { ascending: false }).limit(1).maybeSingle(),
      ])

      if (eq.data) setEquipe(eq.data as Equipe)
      if (impSku.data) setImpactSku(impSku.data as ImpactSku)
      if (impFam.data) setImpactFamille(impFam.data as ImpactFamille)
      if (impCib.data) setImpactCible(impCib.data as ImpactCible[])
      if (semSku.data) setSemaineSku(semSku.data as SemaineRow[])
      if (table.data) setSkuTable(table.data as SkuTableRow[])
      if (hp.data) setHorsPrix(hp.data as DetailRow[])
      if (maj.data) setDerniereMaj((maj.data as { uploaded_at: string }).uploaded_at)

      setLoading(false)
    }

    charger()
  }, [numero])

  const semaines = useMemo(() => {
    const skuMap = new Map<number, SemaineRow>()
    for (const r of semaineSku) {
      const existant = skuMap.get(r.semaine_offset)
      if (existant) {
        existant.ca += r.ca
        existant.clients += r.clients
        existant.pendant_promo = existant.pendant_promo || !!r.pendant_promo
      } else {
        skuMap.set(r.semaine_offset, { ...r })
      }
    }
    const offsets: number[] = []
    for (let i = -4; i <= 4; i++) offsets.push(i)
    return offsets.map((offset) => ({
      offset,
      pendant: skuMap.get(offset)?.pendant_promo ?? false,
      ca: skuMap.get(offset)?.ca ?? 0,
      clients: skuMap.get(offset)?.clients ?? 0,
    }))
  }, [semaineSku])

  const maxCa = Math.max(1, ...semaines.map((s) => s.ca))

  const horsPrixCibleOk = useMemo(() => {
    const cibles = meta?.cible || []
    return horsPrix.filter((r) => r.cible_client && cibles.includes(r.cible_client))
  }, [horsPrix, meta])

  const horsPrixFiltre = refFiltre ? horsPrixCibleOk.filter((r) => r.ref === refFiltre) : horsPrixCibleOk

  const ouvrirHorsPrix = (ref?: string) => {
    if (ref) setRefFiltre(ref)
    setHorsPrixOuvert(true)
    setCategorie('ventes')
  }

  const copierLienFormulaire = async () => {
    try {
      const url = window.location.origin + '/promo/nouvelle'
      await navigator.clipboard.writeText(url)
      setLienCopie(true)
      setTimeout(() => setLienCopie(false), 2000)
    } catch {
      setErreur('Impossible de copier le lien automatiquement')
    }
  }

  const statutPeriode = useMemo(() => {
    if (!meta) return null
    const aujourdhui = new Date()
    aujourdhui.setHours(0, 0, 0, 0)
    const fin = new Date(meta.date_fin)
    return aujourdhui > fin ? 'Termine' : 'En cours'
  }, [meta])

  const nbSemainesPromo = useMemo(() => {
    if (!meta) return 1
    const jours = (new Date(meta.date_fin).getTime() - new Date(meta.date_debut).getTime()) / 86400000 + 1
    return Math.max(1, Math.round(jours / 7))
  }, [meta])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F6F8]">
        <p className="text-sm text-gray-400">Chargement...</p>
      </div>
    )
  }

  if (erreur || !meta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F6F8]">
        <p className="text-sm text-red-500">{erreur || 'Promotion introuvable'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      <style>{`* { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }`}</style>

      {/* Bloc 2 : barre du haut */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="text-xs text-gray-500">
            <Link href="/dashboard" className="hover:text-[#0057A8]">
              Dashboard
            </Link>
            <span className="mx-1.5">&rsaquo;</span>
            <span className="font-medium text-gray-900">{meta.numero}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={copierLienFormulaire}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300"
            >
              <span className="h-3.5 w-3.5">
                <IconCopy />
              </span>
              {lienCopie ? 'Lien copie' : 'Copier lien du formulaire'}
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-6 sm:px-10">
        {/* Bloc 3 : bandeau titre */}
        <div className="mb-6 flex flex-col justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-start">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {meta.marque}
              {meta.categorie && <span className="text-gray-400"> &middot; {meta.categorie}</span>}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {formatDate(meta.date_debut)} - {formatDate(meta.date_fin)}
              {meta.cible?.length > 0 && <> &middot; cible {meta.cible.join(', ')}</>}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={
                statutPeriode === 'En cours'
                  ? { background: '#DCFCE7', color: '#166534' }
                  : { background: '#F3F4F6', color: '#374151' }
              }
            >
              {statutPeriode}
            </span>
            {derniereMaj && (
              <p className="mt-1.5 text-[11px] text-gray-400">Maj {formatDateHeure(derniereMaj)}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row">
          {/* Bloc 1 : sidebar interne */}
          <nav className="flex gap-2 overflow-x-auto sm:w-52 sm:flex-shrink-0 sm:flex-col sm:overflow-visible">
            {NAV_ITEMS.map((item) => {
              const actif = categorie === item.id
              return (
                <button
                  key={item.id}
                  disabled={item.disabled}
                  onClick={() => !item.disabled && setCategorie(item.id)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[#0067B8] sm:w-full ${
                    item.disabled
                      ? 'cursor-not-allowed text-gray-300'
                      : actif
                      ? 'text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white'
                  }`}
                  style={actif ? { background: item.accent } : undefined}
                >
                  <span className="h-4 w-4">{item.icon}</span>
                  {item.label}
                  {item.disabled && <span className="ml-auto text-[10px] text-gray-300">bientot</span>}
                </button>
              )
            })}
          </nav>

          <div className="min-w-0 flex-1">
            {categorie === 'ventes' && (
              <div className="flex flex-col gap-6">
                {/* Bloc 4 : 4 KPI cards */}
                {impactSku && (
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">CA SKUs promo</p>
                      <div className="mt-2 flex items-baseline justify-between">
                        <div>
                          <p className="text-[10px] text-gray-400">avant</p>
                          <p className="text-base font-semibold text-gray-700">{formatMAD(impactSku.ca_baseline_total / 4)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400">pendant</p>
                          <p className="text-base font-semibold" style={{ color: '#15803D' }}>
                            {formatMAD(impactSku.ca_pendant / nbSemainesPromo)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Clients SKUs promo</p>
                      <div className="mt-2 flex items-baseline justify-between">
                        <div>
                          <p className="text-[10px] text-gray-400">avant</p>
                          <p className="text-base font-semibold text-gray-700">{impactSku.clients_baseline}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400">pendant</p>
                          <p className="text-base font-semibold" style={{ color: '#15803D' }}>
                            {impactSku.clients_pendant}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Ventes hors prix</p>
                      <p className="mt-2 text-2xl font-semibold" style={{ color: '#B91C1C' }}>
                        {horsPrixCibleOk.length}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Contribution marque</p>
                      {impactFamille ? (
                        <div className="mt-2 flex items-baseline gap-2">
                          <p className="text-base font-semibold text-gray-700">
                            {formatCompact(impactFamille.ca_pendant_famille)}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            vs {formatCompact(impactFamille.ca_baseline_famille)}
                          </p>
                          <UpliftBadge avant={impactFamille.ca_baseline_famille} pendant={impactFamille.ca_pendant_famille} />
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-300">-</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Bloc 5 : repartition par cible */}
                <div>
                  <h2 className="mb-2 text-sm font-semibold text-gray-900">Repartition par cible</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {impactCible.map((c) => {
                      const couleur = CIBLE_COLORS[c.cible] || '#64748B'
                      const survolee = cibleSurvolee === c.cible
                      return (
                        <div
                          key={c.cible}
                          onMouseEnter={() => setCibleSurvolee(c.cible)}
                          onMouseLeave={() => setCibleSurvolee(null)}
                          className="cursor-pointer rounded-xl p-3.5 transition"
                          style={{ background: couleur + '14' }}
                        >
                          <p className="text-xs font-semibold" style={{ color: couleur }}>
                            {c.cible}
                          </p>
                          <p className="mt-1 text-lg font-semibold" style={{ color: couleur }}>
                            {survolee ? `${c.clients_pendant} clients` : formatMAD(c.ca_pendant)}
                          </p>
                        </div>
                      )
                    })}
                    {impactCible.length === 0 && (
                      <p className="col-span-full text-xs text-gray-400">Aucune donnee de vente pour l instant.</p>
                    )}
                  </div>
                </div>

                {/* Bloc 6 : graphique de performance */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-gray-900">Performance</h2>
                    {impactSku && (
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>
                          Total CA <span className="font-semibold text-gray-900">{formatMAD(impactSku.ca_pendant)}</span>
                        </span>
                        <span>
                          Total CLT <span className="font-semibold text-gray-900">{impactSku.clients_pendant}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="relative mt-8 flex h-44 items-end gap-2 sm:gap-3">
                    {semaines.map((s) => (
                      <div
                        key={s.offset}
                        className="relative flex flex-1 flex-col items-center gap-1.5"
                        onMouseEnter={() => setSurvolSemaine(s.offset)}
                        onMouseLeave={() => setSurvolSemaine(null)}
                      >
                        {survolSemaine === s.offset && (
                          <div className="absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg border border-gray-100 bg-white px-3 py-2 text-[11px] shadow-md">
                            <p className="font-semibold text-gray-900">{weekLabel(s.offset)}</p>
                            <p className="text-gray-500">CA : {formatMAD(s.ca)}</p>
                            <p className="text-gray-500">CLT : {s.clients}</p>
                          </div>
                        )}
                        <div className="flex h-36 w-full cursor-pointer items-end justify-center">
                          <div
                            className="w-full rounded-t transition-opacity"
                            style={{
                              height: `${(s.ca / maxCa) * 100}%`,
                              background: s.pendant ? '#0057A8' : '#CBD5E1',
                              minHeight: s.ca > 0 ? 3 : 0,
                              opacity: survolSemaine === null || survolSemaine === s.offset ? 1 : 0.5,
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {weekLabel(s.offset)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bloc 7 : liste des SKUs */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900">SKUs de la promo</h2>
                    {refFiltre && (
                      <button onClick={() => setRefFiltre(null)} className="text-xs text-[#0057A8] hover:underline">
                        Retirer le filtre ({refFiltre})
                      </button>
                    )}
                  </div>
                  <div className="mt-4 max-h-72 overflow-y-auto overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-gray-50 uppercase text-gray-400">
                        <tr>
                          <th className="px-3 py-2.5">Ref</th>
                          <th className="px-3 py-2.5 text-right">Prix promo</th>
                          <th className="px-3 py-2.5 text-right">Ventes</th>
                          <th className="px-3 py-2.5 text-right">CA avant</th>
                          <th className="px-3 py-2.5 text-right">CA pendant</th>
                          <th className="px-3 py-2.5 text-right">CLT avant</th>
                          <th className="px-3 py-2.5 text-right">CLT pendant</th>
                          <th className="px-3 py-2.5 text-center">Hors prix</th>
                        </tr>
                      </thead>
                      <tbody>
                        {skuTable.map((r) => (
                          <tr key={r.ref} className="border-t border-gray-100 text-gray-700">
                            <td className="px-3 py-2 font-medium">{r.ref}</td>
                            <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {r.prix_promo ?? '-'}
                            </td>
                            <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {r.qte_pendant}
                            </td>
                            <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {formatMAD(r.ca_avant)}
                            </td>
                            <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {formatMAD(r.ca_pendant)}
                            </td>
                            <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {r.clients_avant}
                            </td>
                            <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {r.clients_pendant}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {r.nb_hors_prix > 0 ? (
                                <button
                                  onClick={() => ouvrirHorsPrix(r.ref)}
                                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#0067B8]"
                                  style={{ background: '#B91C1C' }}
                                >
                                  {r.nb_hors_prix}
                                </button>
                              ) : (
                                <span className="text-gray-300">0</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {skuTable.length === 0 && (
                      <p className="px-3 py-4 text-center text-xs text-gray-400">Aucun SKU pour cette promo.</p>
                    )}
                  </div>
                </div>

                {/* Bloc 8 : equipe promo */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">Equipe</p>
                    <div className="flex items-center gap-2 py-1 text-sm text-gray-700">
                      <span className="h-4 w-4 text-gray-400">
                        <IconUser />
                      </span>
                      CDP : {equipe?.cdp || '-'}
                    </div>
                    <div className="flex items-center gap-2 py-1 text-sm text-gray-700">
                      <span className="h-4 w-4 text-gray-400">
                        <IconPalette />
                      </span>
                      Infographiste : {equipe?.assigne_a_nom || '-'}
                    </div>
                    <div className="flex items-center gap-2 py-1 text-sm text-gray-300">
                      <span className="h-4 w-4 text-gray-300">
                        <IconSend />
                      </span>
                      Envoi NL : {equipe?.envoi_nl || '-'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">Statut periode</p>
                    <p
                      className="text-xl font-semibold"
                      style={{ color: statutPeriode === 'En cours' ? '#15803D' : '#374151' }}
                    >
                      {statutPeriode}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      du {formatDate(meta.date_debut)} au {formatDate(meta.date_fin)}
                    </p>
                  </div>
                </div>

                {/* Bloc 9 : accordion ventes hors prix */}
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <button
                    onClick={() => setHorsPrixOuvert((v) => !v)}
                    className="flex w-full items-center justify-between px-6 py-4 outline-none focus-visible:ring-2 focus-visible:ring-[#0067B8] focus-visible:ring-inset"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      Ventes hors prix promo{refFiltre ? ` · ${refFiltre}` : ''}
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                        {horsPrixCibleOk.length}
                      </span>
                    </span>
                    <IconChevron open={horsPrixOuvert} />
                  </button>

                  {horsPrixOuvert && (
                    <div className="px-6 pb-6">
                      <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 uppercase text-gray-400">
                            <tr>
                              <th className="px-3 py-2.5">Client</th>
                              <th className="px-3 py-2.5">Ref</th>
                              <th className="px-3 py-2.5 text-right">Prix promo</th>
                              <th className="px-3 py-2.5 text-right">Prix vendu</th>
                              <th className="px-3 py-2.5">Date</th>
                              <th className="px-3 py-2.5">Cible</th>
                            </tr>
                          </thead>
                          <tbody>
                            {horsPrixFiltre.slice(0, 100).map((r, i) => (
                              <tr key={i} className="border-t border-gray-100 text-gray-700">
                                <td className="px-3 py-2">{r.client_id}</td>
                                <td className="px-3 py-2">{r.ref}</td>
                                <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {r.prix_attendu}
                                </td>
                                <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {r.prix_reel ?? '-'}
                                </td>
                                <td className="px-3 py-2">{formatDate(r.date_vente)}</td>
                                <td className="px-3 py-2">{r.cible_client}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {horsPrixFiltre.length === 0 && (
                          <p className="px-3 py-4 text-center text-xs text-gray-400">
                            Aucune vente hors prix promo pour la bonne cible.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {categorie === 'mailchimp' && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
                <span
                  className="mx-auto flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ background: '#F59E0B1A', color: '#F59E0B' }}
                >
                  <span className="h-5 w-5">
                    <IconMail />
                  </span>
                </span>
                <h2 className="mt-3 text-sm font-semibold text-gray-900">Mailchimp</h2>
                <p className="mt-1 text-xs text-gray-400">
                  Detection automatique de la campagne liee a {meta.numero}, a venir dans une prochaine etape.
                </p>
              </div>
            )}

            {categorie === 'ga4' && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
                <span
                  className="mx-auto flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ background: '#EA580C1A', color: '#EA580C' }}
                >
                  <span className="h-5 w-5">
                    <IconChart />
                  </span>
                </span>
                <h2 className="mt-3 text-sm font-semibold text-gray-900">Google Analytics</h2>
                <p className="mt-1 text-xs text-gray-400">
                  Detection automatique des pages liees a cette campagne, a venir dans une prochaine etape.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
