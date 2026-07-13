'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

const CIBLES = ['SMB', 'GC', 'SD', 'Retail']

const CDPS = [
  'Anas Benjelloun',
  'Asmaa Cherkaoui',
  'Fatima Menkari',
  'Ghizlaine Gharbi',
  'Hicham Benchakroun',
  'Jaouad Zerrour',
  'Mohamed Benjelloun',
  'Mohamed Bennani',
  'Reda Mohamed Hcine',
  'Sanaa Rizki',
  'Sara Moufakkir',
  'Soraya Bennani',
  'Younes Alaoui Belrhiti',
  'Zouhair Laamiri',
]

const TYPES_PROMO = [
  'Destockage',
  'Nouvel arrivage',
  'Black Friday',
  'Fin d annee',
  'Bundle',
  'Incentive interne',
  'Incentive externe',
  'Incentive interne et externe',
  'Occasions speciales',
]

const MARCOM_EMAIL = 'crea@disway.com'

type SkuRow = {
  ref: string
  description: string
  prix_promo: number | null
  prix_catalogue: number | null
  remise_pct: number | null
}

function parseCsv(text: string): SkuRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const delim = lines[0].includes(';') ? ';' : ','
  const rows: SkuRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map((c) => c.trim())
    if (!cols[0]) continue
    const num = (v: string) => {
      if (!v) return null
      const n = parseFloat(v.replace('%', '').replace(',', '.'))
      return isNaN(n) ? null : n
    }
    rows.push({
      ref: cols[0],
      description: cols[1] || '',
      prix_promo: num(cols[2]),
      prix_catalogue: num(cols[3]),
      remise_pct: num(cols[4]),
    })
  }
  return rows
}

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, j] = d.split('-')
  return j + '/' + m + '/' + y
}

export default function NouvellePromoPage() {
  const [numero, setNumero] = useState('')
  const [cdp, setCdp] = useState('')
  const [marque, setMarque] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [targetValeur, setTargetValeur] = useState('')
  const [targetType, setTargetType] = useState('')
  const [targetUnite, setTargetUnite] = useState('unite')
  const [canal, setCanal] = useState('')
  const [typePromo, setTypePromo] = useState('')
  const [cibles, setCibles] = useState<string[]>([])
  const [skuRows, setSkuRows] = useState<SkuRow[]>([])
  const [csvNom, setCsvNom] = useState('')
  const [loading, setLoading] = useState(false)
  const [soumis, setSoumis] = useState(false)
  const [erreur, setErreur] = useState('')
  const [copie, setCopie] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/next-numero')
      .then((res) => res.json())
      .then((data) => setNumero(data.numero))
      .catch(() => setErreur('Impossible de generer le numero de promo'))
  }, [])

  const toggleCible = (cible: string) => {
    setCibles((prev) =>
      prev.includes(cible) ? prev.filter((c) => c !== cible) : [...prev, cible]
    )
  }

  const telechargerTemplate = () => {
    const contenu =
      'REF;DESCRIPTION;PRIX PROMO;PRIX CATALOGUE;REMISE %\nSKU001;Exemple produit;899;999;10\n'
    const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_skus_promo.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvNom(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rows = parseCsv(String(ev.target?.result || ''))
      setSkuRows(rows)
      if (rows.length === 0) setErreur('CSV vide ou format non reconnu')
      else setErreur('')
    }
    reader.readAsText(file)
  }

  const canalLabel =
    canal === 'web'
      ? 'Only Web'
      : canal === 'web_offline'
      ? 'Web et Offline'
      : canal === 'offline'
      ? 'Only Offline'
      : 'Non precise'

  const objetMail = 'Demande de promo ' + numero

  const corpsMail =
    'Bonjour,\n\n' +
    'Merci de preparer la promo numero : ' + numero + '\n\n' +
    'Details de la campagne :\n' +
    '- CDP : ' + cdp + '\n' +
    '- Marque : ' + marque + '\n' +
    '- Duree : du ' + formatDate(dateDebut) + ' au ' + formatDate(dateFin) + '\n' +
    '- Type de promo : ' + (typePromo || 'Non precise') + '\n' +
    '- Canal : ' + canalLabel + '\n' +
    '- Cible client : ' + (cibles.length > 0 ? cibles.join(', ') : 'Non precise') + '\n' +
    '- Nombre de SKUs : ' + skuRows.length + '\n\n' +
    'Merci d avance.\n' +
    'Cordialement'

  const copierMail = async () => {
    const texteComplet = 'Objet : ' + objetMail + '\n\n' + corpsMail
    try {
      await navigator.clipboard.writeText(texteComplet)
      setCopie(true)
      setTimeout(() => setCopie(false), 2500)
    } catch {
      setErreur('Impossible de copier automatiquement, selectionnez le texte manuellement')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (skuRows.length === 0) {
      setErreur('Merci d importer le fichier CSV des SKUs')
      return
    }
    setLoading(true)
    setErreur('')

    const supabase = createClient()

    const { data: promo, error } = await supabase
      .from('promos')
      .insert({
        numero,
        cdp,
        marque,
        skus: skuRows.map((r) => r.ref),
        date_debut: dateDebut || null,
        date_fin: dateFin || null,
        target_valeur: targetValeur ? parseFloat(targetValeur) : null,
        target_type: targetType || null,
        target_unite: targetUnite,
        canal,
        type_promo: typePromo || null,
        cible: cibles,
      })
      .select()
      .single()

    if (error || !promo) {
      setLoading(false)
      setErreur('Erreur lors de la soumission: ' + (error?.message || ''))
      return
    }

    const { error: skuError } = await supabase.from('promo_skus').insert(
      skuRows.map((r) => ({ ...r, promo_id: promo.id }))
    )

    setLoading(false)

    if (skuError) {
      setErreur('Fiche creee mais erreur sur les SKUs: ' + skuError.message)
      return
    }

    setSoumis(true)
  }

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
  const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700'

  if (soumis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-sm sm:p-10">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-center text-xl font-bold text-gray-900">
            Demande bien enregistree
          </h1>
          <p className="mt-2 text-center text-sm text-gray-500">
            Veuillez envoyer cet email au service MARCOM sur :{' '}
            <a href={'mailto:' + MARCOM_EMAIL} className="font-medium text-blue-600">
              {MARCOM_EMAIL}
            </a>
          </p>

          <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <div className="mb-3 border-b border-gray-200 pb-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Objet
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">{objetMail}</p>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Message
            </p>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-gray-700">{corpsMail}</pre>
          </div>

          <button
            onClick={copierMail}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {copie ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Mail copie
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copier le mail
              </>
            )}
          </button>

          <a
            href={'mailto:' + MARCOM_EMAIL + '?subject=' + encodeURIComponent(objetMail) + '&body=' + encodeURIComponent(corpsMail)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white py-3.5 text-sm font-semibold text-gray-600 transition hover:border-gray-300"
          >
            Ouvrir dans la messagerie
          </a>

          <button
            onClick={() => window.location.reload()}
            className="mt-3 w-full text-center text-sm text-gray-400 transition hover:text-gray-600"
          >
            Creer une nouvelle promo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-3xl bg-white p-8 shadow-sm sm:p-10">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Fiche promo
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          Nouvelle promo{' '}
          <span className="text-blue-600">{numero || '...'}</span>
        </h1>
        <p className="mt-1 mb-8 text-sm text-gray-500">
          Renseignez les informations de la campagne promo
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={labelClass}>Nom du CDP</label>
            <select
              className={inputClass}
              value={cdp}
              onChange={(e) => setCdp(e.target.value)}
              required
            >
              <option value="">Choisir un CDP</option>
              {CDPS.map((nom) => (
                <option key={nom} value={nom}>
                  {nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Marque</label>
            <input
              className={inputClass}
              value={marque}
              onChange={(e) => setMarque(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date de debut</label>
              <input
                type="date"
                className={inputClass}
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Date de fin</label>
              <input
                type="date"
                className={inputClass}
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Target</label>
            <div className="grid grid-cols-3 gap-4">
              <input
                type="number"
                step="0.01"
                placeholder="Valeur"
                className={inputClass}
                value={targetValeur}
                onChange={(e) => setTargetValeur(e.target.value)}
              />
              <select
                className={inputClass}
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
              >
                <option value="">Type de target</option>
                <option value="ca">CA</option>
                <option value="quantite">Quantite</option>
                <option value="clients">Nombre de clients</option>
                <option value="commandes">Nombre de commandes</option>
                <option value="reactivations">Reactivations client</option>
              </select>
              <select
                className={inputClass}
                value={targetUnite}
                onChange={(e) => setTargetUnite(e.target.value)}
              >
                <option value="unite">Unite</option>
                <option value="pourcentage">Pourcentage</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Canal</label>
              <select
                className={inputClass}
                value={canal}
                onChange={(e) => setCanal(e.target.value)}
                required
              >
                <option value="">Choisir un canal</option>
                <option value="web">Only Web</option>
                <option value="web_offline">Web et Offline</option>
                <option value="offline">Only Offline</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Type de promo</label>
              <select
                className={inputClass}
                value={typePromo}
                onChange={(e) => setTypePromo(e.target.value)}
              >
                <option value="">Choisir un type</option>
                {TYPES_PROMO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Cible client</label>
            <div className="flex flex-wrap gap-2">
              {CIBLES.map((cible) => {
                const actif = cibles.includes(cible)
                return (
                  <button
                    key={cible}
                    type="button"
                    onClick={() => toggleCible(cible)}
                    className={
                      actif
                        ? 'flex items-center gap-2 rounded-full border border-blue-600 bg-blue-50 px-5 py-2.5 text-sm font-medium text-blue-700 transition'
                        : 'flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:border-gray-300'
                    }
                  >
                    {actif && (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {cible}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className={labelClass}>SKUs de la promo</label>
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
              <p className="text-sm text-gray-500">
                Importez le fichier CSV des SKUs
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Colonnes : REF, DESCRIPTION, PRIX PROMO, PRIX CATALOGUE, REMISE %
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={telechargerTemplate}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300"
                >
                  Telecharger la template
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Importer le CSV
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>
              {csvNom && (
                <p className="mt-3 text-xs font-medium text-blue-600">
                  {csvNom} - {skuRows.length} SKU(s) importe(s)
                </p>
              )}
            </div>

            {skuRows.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Ref</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Prix promo</th>
                      <th className="px-4 py-3">Prix catalogue</th>
                      <th className="px-4 py-3">Remise %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skuRows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t border-gray-100 text-gray-700">
                        <td className="px-4 py-2.5 font-medium">{r.ref}</td>
                        <td className="px-4 py-2.5">{r.description}</td>
                        <td className="px-4 py-2.5">{r.prix_promo ?? '-'}</td>
                        <td className="px-4 py-2.5">{r.prix_catalogue ?? '-'}</td>
                        <td className="px-4 py-2.5">{r.remise_pct ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {skuRows.length > 5 && (
                  <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
                    + {skuRows.length - 5} autres SKUs
                  </p>
                )}
              </div>
            )}
          </div>

          {erreur && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {erreur}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Envoi en cours...' : 'Soumettre la fiche'}
          </button>
        </form>
      </div>
    </div>
  )
}
