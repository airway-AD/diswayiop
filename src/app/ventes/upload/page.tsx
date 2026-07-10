'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type VenteRow = {
  code_famille: string
  code_sous_famille: string
  reference_sku: string
  client_id: string
  code_cible: string | null
  cible_mappee: string | null
  mois: string
  date_vente: string | null
  canal: string
  montant_ca: number | null
  quantite: number | null
  prix_vente: number | null
  montant_vide: boolean
}

// Convertit un montant format francais milliers ("13.365" ou "-49.650") en nombre entier
function parseMontant(v: string): number | null {
  if (!v || v.trim() === '') return null
  const clean = v.trim().replace(/\./g, '').replace(/\s/g, '')
  const n = parseInt(clean, 10)
  return isNaN(n) ? null : n
}

function parseQuantite(v: string): number | null {
  if (!v || v.trim() === '') return null
  const n = parseInt(v.trim().replace(/\./g, ''), 10)
  return isNaN(n) ? null : n
}

// Extrait la date au format YYYY-MM-DD depuis "2026-04-03 00:00:00.000"
function parseDate(v: string): string | null {
  if (!v || v.trim() === '') return null
  const m = v.trim().match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

// Mappe le code vendeur client (BU) vers une cible commerciale (SMB/GC/SD/Retail/GD/GR)
// Regle : tant qu il y a TV suivi de chiffres -> SMB. GC ou KB -> GC. SD -> SD.
// RET -> Retail. GD seul -> GD. GR -> categorie a part (pas encore definie).
// NA, SW, DIRECT, EXPORT -> ignore (null)
function mapCible(code: string): string | null {
  if (!code) return null
  const c = code.trim().toUpperCase()

  if (/^TV\d+$/.test(c)) return 'SMB'
  if (c === 'KB' || c.startsWith('GC')) return 'GC'
  if (c.startsWith('SD')) return 'SD'
  if (c.startsWith('RET')) return 'Retail'
  if (c === 'GD') return 'GD'
  if (c.startsWith('GR')) return 'GR'

  // NA, SW1/SW2/SW4, DIRECT, EXPORT et tout code non reconnu -> ignore
  return null
}

function parseCsvNav(text: string): { rows: VenteRow[]; ignorees: number; budget: number } {
  const lines = text.split(/\r?\n/)
  const rows: VenteRow[] = []
  let ignorees = 0
  let budget = 0

  let lastSku = ''
  let lastClient = ''
  let lastFamille = ''
  let lastSousFamille = ''
  let dataStarted = false

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw || raw.trim() === '') continue

    const cols = raw.split(';').map((c) => c.trim())

    // Detecter la ligne d entete (contient "Commande Web")
    if (!dataStarted) {
      if (raw.includes('Commande Web')) {
        dataStarted = true
      }
      continue
    }

    // Colonnes : 0 Famille, 1 SousFamille, 2 SKU, 3 CLT, 4 Code Vendeur Client (cible),
    // 5 Mois, 6 Jour, 7 CommandeWeb, 8 Montant, 9 Quantite
    let famille = cols[0] || ''
    let sousFamille = cols[1] || ''
    let sku = cols[2] || ''
    let client = cols[3] || ''
    const codeCibleRaw = cols[4] || ''
    const mois = cols[5] || ''
    const jour = cols[6] || ''
    const commandeWeb = cols[7] || ''
    const montantStr = cols[8] || ''
    const quantiteStr = cols[9] || ''

    // Forward-fill (securite pour cellules vides)
    if (famille) lastFamille = famille
    else famille = lastFamille
    if (sousFamille) lastSousFamille = sousFamille
    else sousFamille = lastSousFamille
    if (sku) lastSku = sku
    else sku = lastSku
    if (client) lastClient = client
    else client = lastClient

    // Ignorer les lignes budget/prevision
    if (sku.toUpperCase().startsWith('BUDGET_')) {
      budget++
      continue
    }

    // Ignorer les lignes sans SKU exploitable
    if (!sku) {
      ignorees++
      continue
    }

    const montant = parseMontant(montantStr)
    const quantite = parseQuantite(quantiteStr)
    const prixUnitaire =
      montant !== null && quantite && quantite !== 0
        ? Math.round((montant / quantite) * 100) / 100
        : null

    const codeCible = codeCibleRaw || null
    const cibleMappee = mapCible(codeCibleRaw)

    rows.push({
      code_famille: famille,
      code_sous_famille: sousFamille,
      reference_sku: sku,
      client_id: client,
      code_cible: codeCible,
      cible_mappee: cibleMappee,
      mois,
      date_vente: parseDate(jour),
      canal: commandeWeb.toLowerCase() === 'oui' ? 'online' : 'offline',
      montant_ca: montant,
      quantite,
      prix_vente: prixUnitaire,
      montant_vide: montant === null,
    })
  }

  return { rows, ignorees, budget }
}

export default function UploadVentesPage() {
  const [fichierNom, setFichierNom] = useState('')
  const [rows, setRows] = useState<VenteRow[]>([])
  const [stats, setStats] = useState<{ ignorees: number; budget: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const [termine, setTermine] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFichierNom(file.name)
    setTermine(false)
    setMessage('')
    setErreur('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '')
      const { rows, ignorees, budget } = parseCsvNav(text)
      setRows(rows)
      setStats({ ignorees, budget })
      if (rows.length === 0) setErreur('Aucune ligne exploitable trouvee dans le fichier')
    }
    // Lire en Windows-1252 pour les accents (export Excel FR)
    reader.readAsText(file, 'windows-1252')
  }

  const lancerImport = async () => {
    if (rows.length === 0) return
    setLoading(true)
    setErreur('')
    setMessage('')
    setProgress(0)

    const supabase = createClient()

    // 1. Vider les anciennes ventes (remplacement complet)
    setMessage('Suppression des anciennes donnees...')
    const { error: delError } = await supabase
      .from('ventes_nav')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (delError) {
      setLoading(false)
      setErreur('Erreur suppression: ' + delError.message)
      return
    }

    // 2. Inserer par lots de 500
    const BATCH = 500
    const total = rows.length
    for (let i = 0; i < total; i += BATCH) {
      const lot = rows.slice(i, i + BATCH)
      const { error } = await supabase.from('ventes_nav').insert(lot)
      if (error) {
        setLoading(false)
        setErreur('Erreur insertion (lot ' + (i / BATCH + 1) + '): ' + error.message)
        return
      }
      const done = Math.min(i + BATCH, total)
      setProgress(Math.round((done / total) * 100))
      setMessage('Insertion en cours... ' + done + ' / ' + total)
    }

    setLoading(false)
    setTermine(true)
    setMessage(total + ' ventes importees avec succes')
  }

  const montantVides = rows.filter((r) => r.montant_vide).length
  const online = rows.filter((r) => r.canal === 'online').length
  const offline = rows.filter((r) => r.canal === 'offline').length
  const sansCible = rows.filter((r) => !r.cible_mappee).length

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-3xl bg-white p-8 shadow-sm sm:p-10">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Admin - TCD Ventes
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Import des ventes NAV</h1>
        <p className="mt-1 mb-8 text-sm text-gray-500">
          Chargez l export CSV NAV. Les donnees existantes seront remplacees.
        </p>

        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500">Selectionnez votre fichier CSV NAV</p>
          <p className="mt-1 text-xs text-gray-400">
            Format export Excel (separateur point-virgule)
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-4 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Choisir le fichier CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFile}
          />
          {fichierNom && (
            <p className="mt-3 text-xs font-medium text-blue-600">{fichierNom}</p>
          )}
        </div>

        {rows.length > 0 && (
          <div className="mt-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-2xl bg-blue-50 p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{rows.length}</p>
                <p className="mt-1 text-xs text-gray-500">Lignes a importer</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{online}</p>
                <p className="mt-1 text-xs text-gray-500">Online (web)</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{offline}</p>
                <p className="mt-1 text-xs text-gray-500">Offline</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{montantVides}</p>
                <p className="mt-1 text-xs text-gray-500">Montant vide</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{sansCible}</p>
                <p className="mt-1 text-xs text-gray-500">Sans cible (NA/SW/...)</p>
              </div>
            </div>

            {stats && (
              <p className="mt-3 text-xs text-gray-400">
                {stats.budget} lignes budget ignorees, {stats.ignorees} lignes non exploitables ignorees
              </p>
            )}

            <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-3 py-3">Marque</th>
                    <th className="px-3 py-3">SKU</th>
                    <th className="px-3 py-3">Client</th>
                    <th className="px-3 py-3">Cible</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Canal</th>
                    <th className="px-3 py-3">Montant</th>
                    <th className="px-3 py-3">Qte</th>
                    <th className="px-3 py-3">PU</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 6).map((r, i) => (
                    <tr key={i} className="border-t border-gray-100 text-gray-700">
                      <td className="px-3 py-2.5">{r.code_famille}</td>
                      <td className="px-3 py-2.5 font-medium">{r.reference_sku}</td>
                      <td className="px-3 py-2.5">{r.client_id}</td>
                      <td className="px-3 py-2.5">
                        {r.cible_mappee ?? (
                          <span className="text-gray-300">{r.code_cible ?? '-'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">{r.date_vente ?? '-'}</td>
                      <td className="px-3 py-2.5">{r.canal}</td>
                      <td className="px-3 py-2.5">{r.montant_ca ?? '-'}</td>
                      <td className="px-3 py-2.5">{r.quantite ?? '-'}</td>
                      <td className="px-3 py-2.5">{r.prix_vente ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 6 && (
                <p className="border-t border-gray-100 px-3 py-2 text-xs text-gray-400">
                  + {rows.length - 6} autres lignes
                </p>
              )}
            </div>

            {loading && (
              <div className="mt-5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: progress + '%' }}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-gray-500">{message}</p>
              </div>
            )}

            {!loading && !termine && (
              <button
                onClick={lancerImport}
                className="mt-5 w-full rounded-full bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Importer {rows.length} ventes dans DIOP
              </button>
            )}
          </div>
        )}

        {termine && (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-green-50 py-4 text-sm font-medium text-green-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {message}
          </div>
        )}

        {erreur && (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{erreur}</p>
        )}
      </div>
    </div>
  )
}
