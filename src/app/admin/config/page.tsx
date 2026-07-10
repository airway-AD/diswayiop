'use client'

import { useState } from 'react'

export default function ConfigPage() {
  const [copie, setCopie] = useState(false)
  const [lien, setLien] = useState('')

  const copierLien = async () => {
    const url = lien || `${window.location.origin}/promo/nouvelle`
    try {
      await navigator.clipboard.writeText(url)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // ignore, presse-papier indisponible
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <header className="bg-[#0B1220] px-6 py-6 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs uppercase tracking-wide text-white/40">DIOP - Admin</p>
          <h1 className="mt-1 text-xl font-bold text-white">Configuration</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 sm:px-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">Formulaire CDP</h2>
          <p className="mt-1 text-xs text-gray-400">
            Lien a envoyer aux CDP pour qu&apos;ils saisissent une nouvelle promo. Acces libre,
            pas de mot de passe requis.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={
                typeof window !== 'undefined'
                  ? `${window.location.origin}/promo/nouvelle`
                  : '/promo/nouvelle'
              }
              onFocus={(e) => e.target.select()}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700"
            />
            <button
              onClick={copierLien}
              className="shrink-0 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-[#0057A8] outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-[#0067B8]"
            >
              {copie ? 'Copie' : 'Copier'}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">Mailchimp</h2>
          <p className="mt-1 text-xs text-gray-400">
            Pas encore branche. Cette section servira a configurer la cle API Mailchimp pour la
            detection automatique des campagnes.
          </p>
          <input
            disabled
            placeholder="Cle API Mailchimp (a venir)"
            className="mt-3 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400"
          />
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">Google Analytics (GA4)</h2>
          <p className="mt-1 text-xs text-gray-400">
            Pas encore branche. Cette section servira a configurer le compte de service GA4 et
            l&apos;identifiant de propriete.
          </p>
          <input
            disabled
            placeholder="ID de propriete GA4 (a venir)"
            className="mt-3 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400"
          />
        </div>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">Journal d&apos;erreurs</h2>
          <p className="mt-3 rounded-xl bg-gray-50 px-4 py-6 text-center text-xs text-gray-400">
            Aucune erreur enregistree pour l&apos;instant. Ce journal sera alimente une fois les
            integrations Mailchimp et GA4 actives.
          </p>
        </div>
      </main>
    </div>
  )
}