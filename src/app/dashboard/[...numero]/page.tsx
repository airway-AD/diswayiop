'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Meta = {
  promo_id: string
  numero: string
  marque: string
  cible: string[]
  date_debut: string
  date_fin: string
  sous_familles: string[] | null
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
  ca_baseline_famille: number
  ca_pendant_famille: number
  clients_baseline_famille: number
  clients_pendant_famille: number
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

// --- Icones inline (simples, generiques) ---
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
const IconTrending = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M3 17l6-6 4 4 7-8" />
    <path d="M14 6h6v6" />
  </svg>
)
const IconBox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M3 8l9-5 9 5-9 5-9-5z" />
    <path d="M3 8v9l9 5 9-5V8" />
    <path d="M12 13v9" />
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

// --- Carte KPI coloree ---
function KpiCard({
  label,
  value,
  accent,
  icon,
  sub,
}: {
  label: string
  value: React.ReactNode
  accent: string
  icon: React.ReactNode
  sub?: string
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: accent + '1A', color: accent }}
        >
          <span className="h-4 w-4">{icon}</span>
        </span>
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      </div>
      <div className="mt-3 text-lg font-semibold text-gray-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
    </div>
  )
}

const NAV_ITEMS: { id: Categorie; label: string; icon: React.ReactNode; accent: string; disabled?: boolean }[] = [
  { id: 'ventes', label: 'Ventes', icon: <IconCoins />, accent: '#0057A8' },
  { id: 'mailchimp', label: 'Mailchimp', icon: <IconMail />, accent: '#F59E0B' },
  { id: 'ga4', label: 'Google Analytics', icon: <IconChart />, accent: '#EA580C' },
  { id: 'stock', label: 'Stock', icon: <IconArchive />, accent: '#64748B', disabled: true },
]

export default function PromoDetailPage({ params }: { params: Promise<{ numero: string[] }> }) {
  const { numero: numeroSegments } = use(params)
  const numero = numeroSegments.join('/')

  const [meta, setMeta] = useState<Meta | null>(null)
  const [impactSku, setImpactSku] = useState<ImpactSku | null>(null)
  const [impactFamille, setImpactFamille] = useState<ImpactFamille | null>(null)
  const [semaineSku, setSemaineSku] = useState<SemaineRow[]>([])
  const [semaineFamille, setSemaineFamille] = useState<SemaineRow[]>([])
  const [skuTable, setSkuTable] = useState<SkuTableRow[]>([])
  const [horsPrix, setHorsPrix] = useState<DetailRow[]>([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')

  const [categorie, setCategorie] = useState<Categorie>('ventes')
  const [metrique, setMetrique] = useState<'ca' | 'clients'>('ca')
  const [showContribution, setShowContribution] = useState(false)
  const [refFiltre, setRefFiltre] = useState<string | null>(null)
  const [horsPrixOuvert, setHorsPrixOuvert] = useState(false)

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

      const [impSku, impFam, semSku, semFam, table, hp] = await Promise.all([
        supabase.from('promo_impact_sku').select('*').eq('numero', numero).maybeSingle(),
        supabase.from('promo_impact_famille').select('*').eq('numero', numero).maybeSingle(),
        supabase.from('promo_semaine_sku').select('*').eq('numero', numero),
        supabase.from('promo_semaine_famille').select('*').eq('numero', numero),
        supabase.from('promo_sku_table').select('*').eq('numero', numero),
        supabase
          .from('promo_matching_detail')
          .select('*')
          .eq('promo_id', promoId)
          .eq('statut', 'prix_non_conforme')
          .order('date_vente', { ascending: false }),
      ])

      if (impSku.data) setImpactSku(impSku.data as ImpactSku)
      if (impFam.data) setImpactFamille(impFam.data as ImpactFamille)
      if (semSku.data) setSemaineSku(semSku.data as SemaineRow[])
      if (semFam.data) setSemaineFamille(semFam.data as SemaineRow[])
      if (table.data) setSkuTable(table.data as SkuTableRow[])
      if (hp.data) setHorsPrix(hp.data as DetailRow[])

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
    const famMap = new Map<number, SemaineRow>()
    for (const r of semaineFamille) famMap.set(r.semaine_offset, r)

    const offsets: number[] = []
    for (let i = -4; i <= 4; i++) offsets.push(i)

    return offsets.map((offset) => ({
      offset,
      pendant: skuMap.get(offset)?.pendant_promo ?? false,
      skuVal: metrique === 'ca' ? skuMap.get(offset)?.ca ?? 0 : skuMap.get(offset)?.clients ?? 0,
      famVal: metrique === 'ca' ? famMap.get(offset)?.ca ?? 0 : famMap.get(offset)?.clients ?? 0,
    }))
  }, [semaineSku, semaineFamille, metrique])

  const maxVal = Math.max(1, ...semaines.map((s) => Math.max(s.skuVal, showContribution ? s.famVal : 0)))

  const prixAvantGlobal =
    impactSku && impactSku.qte_baseline_total > 0
      ? Math.round((impactSku.ca_baseline_total / impactSku.qte_baseline_total) * 100) / 100
      : null
  const prixPendantGlobal =
    impactSku && impactSku.qte_pendant > 0
      ? Math.round((impactSku.ca_pendant / impactSku.qte_pendant) * 100) / 100
      : null
  const baisseAbs =
    prixAvantGlobal !== null && prixPendantGlobal !== null
      ? Math.round((prixAvantGlobal - prixPendantGlobal) * 100) / 100
      : null
  const baissePct =
    baisseAbs !== null && prixAvantGlobal !== null && prixAvantGlobal > 0
      ? Math.round((baisseAbs / prixAvantGlobal) * 1000) / 10
      : null

  // Ventes hors prix promo, uniquement pour les clients dans la bonne cible
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
      <style>{`
        * { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        @keyframes pulseBorder {
          0%, 100% { box-shadow: 0 0 0 0 rgba(21,128,61,0.45); }
          50% { box-shadow: 0 0 0 5px rgba(21,128,61,0); }
        }
        .contrib-active {
          animation: pulseBorder 1.6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .contrib-active { animation: none; }
        }
      `}</style>

      {/* En-tete visuel avec chips */}
      <header className="bg-[#0B1220] px-6 py-6 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <Link href="/dashboard" className="text-xs text-white/50 hover:text-white/80">
            ← Retour au dashboard
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-[#0057A8] px-3 py-1.5 text-sm font-bold text-white">{meta.numero}</span>
            <span className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white">{meta.marque}</span>
            {meta.sous_familles?.map((sf) => (
              <span key={sf} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80">
                {sf}
              </span>
            ))}
            <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80">
              {formatDate(meta.date_debut)} → {formatDate(meta.date_fin)}
            </span>
            {meta.cible?.map((c) => (
              <span
                key={c}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                style={{ background: '#0067B8' }}
              >
                Cible {c}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
        <div className="flex flex-col gap-6 sm:flex-row">
          {/* Sidebar interne : categories de donnees */}
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

          {/* Contenu de la categorie selectionnee */}
          <div className="min-w-0 flex-1">
            {categorie === 'ventes' && (
              <div className="flex flex-col gap-6">
                {/* KPIs colores */}
                {impactSku && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                    <KpiCard label="CA avant (4 sem.)" value={formatMAD(impactSku.ca_baseline_total)} accent="#0057A8" icon={<IconCoins />} />
                    <KpiCard label="CA pendant" value={formatMAD(impactSku.ca_pendant)} accent="#15803D" icon={<IconCoins />} />
                    <KpiCard
                      label="Uplift"
                      value={<UpliftBadge avant={impactSku.ca_baseline_total} pendant={impactSku.ca_pendant} />}
                      accent="#7C3AED"
                      icon={<IconTrending />}
                    />
                    <KpiCard
                      label="Prix unitaire moyen"
                      value={prixPendantGlobal !== null ? prixPendantGlobal.toLocaleString('fr-FR') : '-'}
                      accent="#0891B2"
                      icon={<IconCoins />}
                      sub={`avant : ${prixAvantGlobal !== null ? prixAvantGlobal.toLocaleString('fr-FR') : '-'}`}
                    />
                    <KpiCard
                      label="Baisse de prix"
                      value={baisseAbs !== null ? baisseAbs.toLocaleString('fr-FR') : '-'}
                      accent={baisseAbs !== null && baisseAbs > 0 ? '#15803D' : '#B91C1C'}
                      icon={<IconTrending />}
                      sub={baissePct !== null ? `${baissePct >= 0 ? '-' : '+'}${Math.abs(baissePct).toFixed(1)}%` : ''}
                    />
                    <KpiCard
                      label="Clients avant → pendant"
                      value={`${impactSku.clients_baseline} → ${impactSku.clients_pendant}`}
                      accent="#EA580C"
                      icon={<IconUsers />}
                    />
                    <KpiCard
                      label="Qte avant → pendant"
                      value={`${impactSku.qte_baseline_total} → ${impactSku.qte_pendant}`}
                      accent="#64748B"
                      icon={<IconBox />}
                    />
                  </div>
                )}

                {/* Graphique */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-gray-900">Evolution hebdomadaire</h2>
                    <div className="flex items-center gap-2">
                      <div className="flex rounded-full border border-gray-200 p-0.5">
                        <button
                          onClick={() => setMetrique('ca')}
                          className={`rounded-full px-3 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#0067B8] ${
                            metrique === 'ca' ? 'bg-gray-900 text-white' : 'text-gray-500'
                          }`}
                        >
                          CA
                        </button>
                        <button
                          onClick={() => setMetrique('clients')}
                          className={`rounded-full px-3 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#0067B8] ${
                            metrique === 'clients' ? 'bg-gray-900 text-white' : 'text-gray-500'
                          }`}
                        >
                          CLT
                        </button>
                      </div>
                      <button
                        onClick={() => setShowContribution((v) => !v)}
                        className={`rounded-full border-2 px-3 py-1 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#0067B8] ${
                          showContribution ? 'contrib-active border-[#15803D] text-[#15803D]' : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        Contribution marque
                      </button>
                    </div>
                  </div>

                  <div className="mt-8 flex h-52 items-end gap-2 sm:gap-3">
                    {semaines.map((s) => (
                      <div key={s.offset} className="flex flex-1 flex-col items-center gap-1.5">
                        <div className="flex h-40 w-full items-end justify-center gap-1">
                          <div className="flex h-40 w-full flex-col items-end justify-end">
                            {s.skuVal > 0 && (
                              <span className="mb-1 self-center text-[10px] font-semibold text-gray-500">
                                {metrique === 'ca' ? formatCompact(s.skuVal) : s.skuVal}
                              </span>
                            )}
                            <div
                              className="w-full rounded-t motion-safe:transition-all"
                              style={{
                                height: `${(s.skuVal / maxVal) * 100}%`,
                                background: s.pendant ? '#0057A8' : '#CBD5E1',
                                minHeight: s.skuVal > 0 ? 3 : 0,
                              }}
                            />
                          </div>
                          {showContribution && (
                            <div className="flex h-40 w-full flex-col items-end justify-end">
                              {s.famVal > 0 && (
                                <span className="mb-1 self-center text-[10px] font-semibold text-gray-500">
                                  {metrique === 'ca' ? formatCompact(s.famVal) : s.famVal}
                                </span>
                              )}
                              <div
                                className="w-full rounded-t motion-safe:transition-all"
                                style={{
                                  height: `${(s.famVal / maxVal) * 100}%`,
                                  background: s.pendant ? '#B45309' : '#F3D9B1',
                                  minHeight: s.famVal > 0 ? 3 : 0,
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {s.offset === 0 ? 'P' : s.offset > 0 ? `P+${s.offset}` : `S${s.offset}`}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm" style={{ background: '#0057A8' }} /> SKUs de la promo (pendant)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm" style={{ background: '#CBD5E1' }} /> SKUs de la promo (hors periode)
                    </span>
                    {showContribution && (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-sm" style={{ background: '#B45309' }} /> Marque entiere
                      </span>
                    )}
                  </div>

                  {impactFamille && showContribution && (
                    <div className="mt-4 flex flex-wrap gap-6 border-t border-gray-100 pt-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Impact marque · CA</p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-sm text-gray-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatMAD(impactFamille.ca_baseline_famille)} → {formatMAD(impactFamille.ca_pendant_famille)}
                          </p>
                          <UpliftBadge avant={impactFamille.ca_baseline_famille} pendant={impactFamille.ca_pendant_famille} />
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Impact marque · Clients</p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-sm text-gray-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {impactFamille.clients_baseline_famille} → {impactFamille.clients_pendant_famille}
                          </p>
                          <UpliftBadge
                            avant={impactFamille.clients_baseline_famille}
                            pendant={impactFamille.clients_pendant_famille}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tableau detail SKUs */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900">Detail par SKU</h2>
                    {refFiltre && (
                      <button onClick={() => setRefFiltre(null)} className="text-xs text-[#0057A8] hover:underline">
                        Retirer le filtre ({refFiltre})
                      </button>
                    )}
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 uppercase text-gray-400">
                        <tr>
                          <th className="px-3 py-2.5">Ref</th>
                          <th className="px-3 py-2.5 text-right">Prix avant</th>
                          <th className="px-3 py-2.5 text-right">Prix pendant</th>
                          <th className="px-3 py-2.5 text-center">Hors prix</th>
                          <th className="px-3 py-2.5 text-right">CA avant</th>
                          <th className="px-3 py-2.5 text-right">CA pendant</th>
                          <th className="px-3 py-2.5 text-right">CLT avant</th>
                          <th className="px-3 py-2.5 text-right">CLT pendant</th>
                          <th className="px-3 py-2.5 text-right">Impact marque CA</th>
                          <th className="px-3 py-2.5 text-right">Impact marque CLT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {skuTable.map((r) => {
                          const aPrixCdp = r.prix_promo !== null && r.prix_promo !== undefined
                          const prixAvant = aPrixCdp
                            ? r.prix_catalogue
                            : r.qte_avant > 0
                            ? Math.round((r.ca_avant / r.qte_avant) * 100) / 100
                            : null
                          const prixPendant = aPrixCdp
                            ? r.prix_promo
                            : r.qte_pendant > 0
                            ? Math.round((r.ca_pendant / r.qte_pendant) * 100) / 100
                            : null
                          return (
                            <tr key={r.ref} className="border-t border-gray-100 text-gray-700">
                              <td className="px-3 py-2 font-medium">{r.ref}</td>
                              <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {prixAvant ?? '-'}
                              </td>
                              <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {prixPendant ?? '-'}
                                {!aPrixCdp && prixPendant !== null && (
                                  <span className="ml-1 text-[10px] text-gray-300" title="Prix calcule (montant/quantite), aucun prix promo saisi par le CDP">
                                    calc.
                                  </span>
                                )}
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
                                  <span className="text-gray-300">{aPrixCdp ? '0' : '-'}</span>
                                )}
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
                              <td className="px-3 py-2 text-right">
                                <UpliftBadge avant={r.ca_baseline_famille} pendant={r.ca_pendant_famille} />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <UpliftBadge avant={r.clients_baseline_famille} pendant={r.clients_pendant_famille} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {skuTable.length === 0 && (
                      <p className="px-3 py-4 text-center text-xs text-gray-400">Aucun SKU pour cette promo.</p>
                    )}
                  </div>
                </div>

                {/* Ventes hors prix promo : accordion ferme par defaut */}
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <button
                    onClick={() => setHorsPrixOuvert((v) => !v)}
                    className="flex w-full items-center justify-between px-6 py-4 outline-none focus-visible:ring-2 focus-visible:ring-[#0067B8] focus-visible:ring-inset"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      Ventes hors prix promo (cible correcte){refFiltre ? ` · ${refFiltre}` : ''}
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
                              <th className="px-3 py-2.5">Ref</th>
                              <th className="px-3 py-2.5">Client</th>
                              <th className="px-3 py-2.5">Cible</th>
                              <th className="px-3 py-2.5">Date</th>
                              <th className="px-3 py-2.5 text-right">Prix attendu</th>
                              <th className="px-3 py-2.5 text-right">Prix reel</th>
                              <th className="px-3 py-2.5 text-right">Montant</th>
                            </tr>
                          </thead>
                          <tbody>
                            {horsPrixFiltre.slice(0, 100).map((r, i) => (
                              <tr key={i} className="border-t border-gray-100 text-gray-700">
                                <td className="px-3 py-2">{r.ref}</td>
                                <td className="px-3 py-2">{r.client_id}</td>
                                <td className="px-3 py-2">{r.cible_client}</td>
                                <td className="px-3 py-2">{formatDate(r.date_vente)}</td>
                                <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {r.prix_attendu}
                                </td>
                                <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {r.prix_reel ?? '-'}
                                </td>
                                <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {r.montant_ca.toLocaleString('fr-FR')}
                                </td>
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
